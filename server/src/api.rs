use crate::db::{self, RoundRow};
use crate::models::{
    CourseFile, CoursePublic, DefaultsOut, HoleHistoryPoint, HoleScoreOut, PlayerOut, RoundIn,
    RoundOut, RoundSummary, StatsOut,
};
use crate::stats;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::routing::get;
use axum::{Json, Router};
use rusqlite::Connection;
use serde::Deserialize;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<Mutex<Connection>>,
    pub course: Arc<CourseFile>,
}

type ApiError = (StatusCode, String);

fn lock(state: &AppState) -> Result<std::sync::MutexGuard<'_, Connection>, ApiError> {
    state
        .db
        .lock()
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "database lock".into()))
}

fn load_scored(
    conn: &Connection,
    course: &CourseFile,
    row: RoundRow,
) -> Result<(RoundRow, Vec<HoleScoreOut>), ApiError> {
    let holes = db::hole_scores(conn, row.id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let scored = holes
        .iter()
        .map(|h| stats::score_out(course, &row, h))
        .collect();
    Ok((row, scored))
}

fn to_out(course: &CourseFile, row: RoundRow, holes: Vec<db::HoleRow>) -> RoundOut {
    stats::round_out(course, row, holes)
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/course", get(course))
        .route("/players", get(players))
        .route("/defaults", get(defaults))
        .route("/rounds", get(list_rounds).post(create_round))
        .route(
            "/rounds/{id}",
            get(get_round).put(update_round).delete(delete_round),
        )
        .route("/stats", get(get_stats))
        .route("/holes/{n}/history", get(hole_history))
        .route("/health", get(health))
}

async fn health() -> &'static str {
    "ok"
}

async fn course(State(state): State<AppState>) -> Json<CoursePublic> {
    Json(CoursePublic::from(state.course.as_ref()))
}

async fn players(State(state): State<AppState>) -> Result<Json<Vec<PlayerOut>>, ApiError> {
    let conn = lock(&state)?;
    let rows = db::list_players(&conn)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(
        rows.into_iter()
            .map(|p| PlayerOut {
                id: p.id,
                name: p.name,
            })
            .collect(),
    ))
}

#[derive(Deserialize)]
struct PlayerQuery {
    player: Option<i64>,
    tee: Option<String>,
}

fn require_player(q: &PlayerQuery) -> Result<i64, ApiError> {
    q.player
        .ok_or((StatusCode::BAD_REQUEST, "player is required".into()))
}

async fn defaults(
    State(state): State<AppState>,
    Query(q): Query<PlayerQuery>,
) -> Result<Json<DefaultsOut>, ApiError> {
    let player_id = require_player(&q)?;
    let conn = lock(&state)?;
    if !db::player_exists(&conn, player_id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    {
        return Err((StatusCode::BAD_REQUEST, "unknown player".into()));
    }
    let d = db::latest_defaults(&conn, player_id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(match d {
        Some((handicap_index, playing_handicap, tee, format)) => DefaultsOut {
            handicap_index,
            playing_handicap,
            tee,
            format,
        },
        None => DefaultsOut {
            handicap_index: None,
            playing_handicap: 18,
            tee: "white".into(),
            format: "stableford".into(),
        },
    }))
}

fn all_scored(
    conn: &Connection,
    course: &CourseFile,
    player_id: i64,
) -> Result<Vec<(RoundRow, Vec<HoleScoreOut>)>, ApiError> {
    let rounds = db::list_rounds(conn, player_id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let mut out = Vec::new();
    for r in rounds {
        out.push(load_scored(conn, course, r)?);
    }
    Ok(out)
}

async fn list_rounds(
    State(state): State<AppState>,
    Query(q): Query<PlayerQuery>,
) -> Result<Json<Vec<RoundSummary>>, ApiError> {
    let player_id = require_player(&q)?;
    let conn = lock(&state)?;
    let scored = all_scored(&conn, &state.course, player_id)?;
    let list = scored
        .iter()
        .map(|(r, h)| stats::summarise(r, h))
        .collect();
    Ok(Json(list))
}

async fn get_round(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<RoundOut>, ApiError> {
    let conn = lock(&state)?;
    let row = db::get_round(&conn, id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "round not found".into()))?;
    let holes = db::hole_scores(&conn, id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(to_out(&state.course, row, holes)))
}

async fn create_round(
    State(state): State<AppState>,
    Json(mut input): Json<RoundIn>,
) -> Result<(StatusCode, Json<RoundOut>), ApiError> {
    db::assign_course_handicap(&state.course, &mut input)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    db::validate_round(&state.course, &input)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    let mut conn = lock(&state)?;
    if !db::player_exists(&conn, input.player_id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    {
        return Err((StatusCode::BAD_REQUEST, "unknown player".into()));
    }
    let id = db::create_round(&mut conn, &input)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let row = db::get_round(&conn, id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .unwrap();
    let holes = db::hole_scores(&conn, id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok((StatusCode::CREATED, Json(to_out(&state.course, row, holes))))
}

async fn update_round(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(mut input): Json<RoundIn>,
) -> Result<Json<RoundOut>, ApiError> {
    db::assign_course_handicap(&state.course, &mut input)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    db::validate_round(&state.course, &input)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    let mut conn = lock(&state)?;
    let existing = db::get_round(&conn, id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "round not found".into()))?;
    if existing.player_id != input.player_id {
        return Err((
            StatusCode::BAD_REQUEST,
            "this round belongs to another player".into(),
        ));
    }
    let ok = db::update_round(&mut conn, id, &input)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !ok {
        return Err((StatusCode::NOT_FOUND, "round not found".into()));
    }
    let row = db::get_round(&conn, id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .unwrap();
    let holes = db::hole_scores(&conn, id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(to_out(&state.course, row, holes)))
}

async fn delete_round(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<StatusCode, ApiError> {
    let conn = lock(&state)?;
    let ok = db::delete_round(&conn, id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !ok {
        return Err((StatusCode::NOT_FOUND, "round not found".into()));
    }
    Ok(StatusCode::NO_CONTENT)
}

async fn get_stats(
    State(state): State<AppState>,
    Query(q): Query<PlayerQuery>,
) -> Result<Json<StatsOut>, ApiError> {
    let player_id = require_player(&q)?;
    let conn = lock(&state)?;
    let mut scored = all_scored(&conn, &state.course, player_id)?;
    if let Some(tee) = q.tee {
        if tee == "white" || tee == "yellow" || tee == "blue" {
            scored.retain(|(r, _)| r.tee == tee);
        }
    }
    Ok(Json(stats::compute_stats(&state.course, &scored)))
}

async fn hole_history(
    State(state): State<AppState>,
    Path(n): Path<i32>,
    Query(q): Query<PlayerQuery>,
) -> Result<Json<Vec<HoleHistoryPoint>>, ApiError> {
    if !(1..=18).contains(&n) {
        return Err((StatusCode::BAD_REQUEST, "hole must be 1–18".into()));
    }
    let player_id = require_player(&q)?;
    let conn = lock(&state)?;
    let mut scored = all_scored(&conn, &state.course, player_id)?;
    if let Some(tee) = q.tee {
        if tee == "white" || tee == "yellow" || tee == "blue" {
            scored.retain(|(r, _)| r.tee == tee);
        }
    }
    Ok(Json(stats::hole_history(&scored, n)))
}
