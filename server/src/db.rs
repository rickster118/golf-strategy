use crate::models::{CourseFile, HoleScoreIn, RoundIn};
use crate::stableford::course_handicap;
use anyhow::{bail, Context, Result};
use rusqlite::{params, Connection, OptionalExtension};

pub fn open(path: &str) -> Result<Connection> {
    let conn = Connection::open(path).with_context(|| format!("open sqlite {path}"))?;
    conn.execute_batch(
        r#"
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS rounds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            played_on TEXT NOT NULL,
            tee TEXT NOT NULL,
            format TEXT NOT NULL,
            playing_handicap INTEGER NOT NULL,
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS hole_scores (
            round_id INTEGER NOT NULL,
            hole INTEGER NOT NULL,
            strokes INTEGER,
            picked_up INTEGER NOT NULL DEFAULT 0,
            putts INTEGER,
            fir TEXT,
            gir INTEGER,
            PRIMARY KEY (round_id, hole),
            FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE
        );
        "#,
    )?;
    let cols: Vec<String> = {
        let mut stmt = conn.prepare("PRAGMA table_info(rounds)")?;
        let rows = stmt.query_map([], |r| r.get::<_, String>(1))?;
        rows.collect::<rusqlite::Result<Vec<_>>>()?
    };
    if !cols.iter().any(|c| c == "handicap_index") {
        conn.execute("ALTER TABLE rounds ADD COLUMN handicap_index REAL", [])?;
    }
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        );
        INSERT OR IGNORE INTO players (name) VALUES ('Ricki'), ('Ramji'), ('Jesant');
        "#,
    )?;
    let cols: Vec<String> = {
        let mut stmt = conn.prepare("PRAGMA table_info(rounds)")?;
        let rows = stmt.query_map([], |r| r.get::<_, String>(1))?;
        rows.collect::<rusqlite::Result<Vec<_>>>()?
    };
    if !cols.iter().any(|c| c == "player_id") {
        conn.execute("ALTER TABLE rounds ADD COLUMN player_id INTEGER REFERENCES players(id)", [])?;
    }
    conn.execute(
        "UPDATE rounds SET player_id = (SELECT id FROM players WHERE name = 'Ricki') WHERE player_id IS NULL",
        [],
    )?;
    Ok(conn)
}

#[derive(Debug, Clone)]
pub struct PlayerRow {
    pub id: i64,
    pub name: String,
}

pub fn list_players(conn: &Connection) -> Result<Vec<PlayerRow>> {
    let mut stmt = conn.prepare("SELECT id, name FROM players ORDER BY id")?;
    let rows = stmt.query_map([], |r| {
        Ok(PlayerRow {
            id: r.get(0)?,
            name: r.get(1)?,
        })
    })?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn player_exists(conn: &Connection, id: i64) -> Result<bool> {
    let n: i64 = conn.query_row("SELECT COUNT(*) FROM players WHERE id = ?1", [id], |r| r.get(0))?;
    Ok(n == 1)
}

#[derive(Debug, Clone)]
pub struct RoundRow {
    pub id: i64,
    pub player_id: i64,
    pub played_on: String,
    pub tee: String,
    pub format: String,
    pub handicap_index: f64,
    pub playing_handicap: i32,
    pub notes: Option<String>,
}

fn map_round(r: &rusqlite::Row<'_>) -> rusqlite::Result<RoundRow> {
    let index: Option<f64> = r.get(5)?;
    let player_id: Option<i64> = r.get(1)?;
    Ok(RoundRow {
        id: r.get(0)?,
        player_id: player_id.unwrap_or(0),
        played_on: r.get(2)?,
        tee: r.get(3)?,
        format: r.get(4)?,
        handicap_index: index.unwrap_or(0.0),
        playing_handicap: r.get(6)?,
        notes: r.get(7)?,
    })
}

#[derive(Debug, Clone)]
pub struct HoleRow {
    pub hole: i32,
    pub strokes: Option<i32>,
    pub picked_up: bool,
    pub putts: Option<i32>,
    pub fir: Option<String>,
    pub gir: Option<bool>,
}

pub fn list_rounds(conn: &Connection, player_id: i64) -> Result<Vec<RoundRow>> {
    let mut stmt = conn.prepare(
        "SELECT id, player_id, played_on, tee, format, handicap_index, playing_handicap, notes
         FROM rounds WHERE player_id = ?1 ORDER BY played_on DESC, id DESC",
    )?;
    let rows = stmt.query_map([player_id], map_round)?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn get_round(conn: &Connection, id: i64) -> Result<Option<RoundRow>> {
    let row = conn
        .query_row(
            "SELECT id, player_id, played_on, tee, format, handicap_index, playing_handicap, notes
             FROM rounds WHERE id = ?1",
            [id],
            map_round,
        )
        .optional()?;
    Ok(row)
}

pub fn hole_scores(conn: &Connection, round_id: i64) -> Result<Vec<HoleRow>> {
    let mut stmt = conn.prepare(
        "SELECT hole, strokes, picked_up, putts, fir, gir
         FROM hole_scores WHERE round_id = ?1 ORDER BY hole",
    )?;
    let rows = stmt.query_map([round_id], |r| {
        let gir: Option<i32> = r.get(5)?;
        Ok(HoleRow {
            hole: r.get(0)?,
            strokes: r.get(1)?,
            picked_up: r.get::<_, i32>(2)? != 0,
            putts: r.get(3)?,
            fir: r.get(4)?,
            gir: gir.map(|g| g != 0),
        })
    })?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn assign_course_handicap(course: &CourseFile, input: &mut RoundIn) -> Result<()> {
    let tee = course
        .tees
        .iter()
        .find(|t| t.id == input.tee)
        .context("unknown tee")?;
    let slope = tee
        .slope_rating
        .with_context(|| format!("{} tees have no slope rating", tee.name))?;
    let rating = tee
        .course_rating
        .with_context(|| format!("{} tees have no course rating", tee.name))?;
    let par = tee.par.unwrap_or(course.par);
    input.playing_handicap = course_handicap(input.handicap_index, slope, rating, par);
    Ok(())
}

pub fn validate_round(course: &CourseFile, input: &RoundIn) -> Result<()> {
    if input.tee != "white" && input.tee != "yellow" && input.tee != "blue" {
        bail!("tee must be white, yellow, or blue");
    }
    match input.format.as_str() {
        "medal" | "stableford" | "rollup" => {}
        _ => bail!("format must be medal, stableford, or rollup"),
    }
    if !input.handicap_index.is_finite()
        || input.handicap_index < -10.0
        || input.handicap_index > 54.0
    {
        bail!("handicap index must be between -10 and 54");
    }
    if input.playing_handicap < -15 || input.playing_handicap > 54 {
        bail!("course handicap must be between -15 and 54");
    }
    if input.holes.len() != 18 {
        bail!("round must include 18 holes");
    }
    let mut seen = [false; 19];
    for h in &input.holes {
        if h.hole < 1 || h.hole > 18 {
            bail!("invalid hole {}", h.hole);
        }
        if seen[h.hole as usize] {
            bail!("duplicate hole {}", h.hole);
        }
        seen[h.hole as usize] = true;
        let card = course
            .hole(h.hole)
            .with_context(|| format!("unknown hole {}", h.hole))?;
        if let Some(s) = h.strokes {
            if s < 1 || s > 20 {
                bail!("hole {} strokes must be 1–20", h.hole);
            }
        }
        if let Some(p) = h.putts {
            if p < 0 || p > 8 {
                bail!("hole {} putts must be 0–8", h.hole);
            }
        }
        if let Some(fir) = &h.fir {
            match fir.as_str() {
                "hit" | "left" | "right" | "na" => {}
                _ => bail!("hole {} fir must be hit, left, right, or na", h.hole),
            }
            if card.par == 3 && fir != "na" {
                bail!("par 3 hole {} FIR must be na", h.hole);
            }
        }
    }
    for n in 1..=18 {
        if !seen[n] {
            bail!("missing hole {n}");
        }
    }
    if !input.holes.iter().any(|h| h.strokes.is_some()) {
        bail!("enter at least one score");
    }
    Ok(())
}

fn insert_holes(conn: &Connection, round_id: i64, holes: &[HoleScoreIn]) -> Result<()> {
    let mut stmt = conn.prepare(
        "INSERT INTO hole_scores (round_id, hole, strokes, picked_up, putts, fir, gir)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    )?;
    for h in holes {
        let gir = h.gir.map(|g| if g { 1 } else { 0 });
        stmt.execute(params![
            round_id,
            h.hole,
            h.strokes,
            if h.picked_up { 1 } else { 0 },
            h.putts,
            h.fir,
            gir,
        ])?;
    }
    Ok(())
}

pub fn create_round(conn: &mut Connection, input: &RoundIn) -> Result<i64> {
    let tx = conn.transaction()?;
    tx.execute(
        "INSERT INTO rounds (player_id, played_on, tee, format, handicap_index, playing_handicap, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            input.player_id,
            input.played_on,
            input.tee,
            input.format,
            input.handicap_index,
            input.playing_handicap,
            input.notes,
        ],
    )?;
    let id = tx.last_insert_rowid();
    insert_holes(&tx, id, &input.holes)?;
    tx.commit()?;
    Ok(id)
}

pub fn update_round(conn: &mut Connection, id: i64, input: &RoundIn) -> Result<bool> {
    let tx = conn.transaction()?;
    let n = tx.execute(
        "UPDATE rounds SET played_on = ?1, tee = ?2, format = ?3, handicap_index = ?4,
            playing_handicap = ?5, notes = ?6
         WHERE id = ?7",
        params![
            input.played_on,
            input.tee,
            input.format,
            input.handicap_index,
            input.playing_handicap,
            input.notes,
            id,
        ],
    )?;
    if n == 0 {
        return Ok(false);
    }
    tx.execute("DELETE FROM hole_scores WHERE round_id = ?1", [id])?;
    insert_holes(&tx, id, &input.holes)?;
    tx.commit()?;
    Ok(true)
}

pub fn delete_round(conn: &Connection, id: i64) -> Result<bool> {
    let n = conn.execute("DELETE FROM rounds WHERE id = ?1", [id])?;
    Ok(n > 0)
}

pub fn latest_defaults(
    conn: &Connection,
    player_id: i64,
) -> Result<Option<(Option<f64>, i32, String, String)>> {
    conn.query_row(
        "SELECT handicap_index, playing_handicap, tee, format
         FROM rounds WHERE player_id = ?1 ORDER BY played_on DESC, id DESC LIMIT 1",
        [player_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
    )
    .optional()
    .map_err(Into::into)
}
