use crate::db::{HoleRow, RoundRow};
use crate::models::{
    CourseFile, HoleHistoryPoint, HoleScoreOut, HoleStats, RoundOut, RoundSummary, StatsOut,
};
use crate::stableford::{hole_points, strokes_received};

pub fn yards_for_tee(course: &CourseFile, hole: i32, tee: &str) -> i32 {
    let h = course.hole(hole).expect("hole");
    match tee {
        "yellow" => h.yards.yellow,
        "blue" => h.yards.blue,
        _ => h.yards.white,
    }
}

pub fn score_out(course: &CourseFile, round: &RoundRow, row: &HoleRow) -> HoleScoreOut {
    let card = course.hole(row.hole).expect("hole");
    let received = strokes_received(round.playing_handicap, card.stroke_index);
    let points = hole_points(
        card.par,
        card.stroke_index,
        round.playing_handicap,
        row.strokes,
        row.picked_up,
    );
    let net = row.strokes.map(|s| s - received);
    let vs_par = row.strokes.map(|s| s - card.par);
    HoleScoreOut {
        hole: row.hole,
        par: card.par,
        stroke_index: card.stroke_index,
        yards: yards_for_tee(course, row.hole, &round.tee),
        strokes: row.strokes,
        picked_up: row.picked_up,
        putts: row.putts,
        fir: row.fir.clone(),
        gir: row.gir,
        strokes_received: received,
        net,
        points,
        vs_par,
    }
}

pub fn round_out(course: &CourseFile, round: RoundRow, holes: Vec<HoleRow>) -> RoundOut {
    let scored: Vec<HoleScoreOut> = holes
        .iter()
        .map(|h| score_out(course, &round, h))
        .collect();
    let summary = summarise(&round, &scored);
    RoundOut {
        id: round.id,
        player_id: round.player_id,
        played_on: round.played_on,
        tee: round.tee,
        format: round.format,
        handicap_index: round.handicap_index,
        playing_handicap: round.playing_handicap,
        notes: round.notes,
        gross: summary.gross,
        vs_par: summary.vs_par,
        points: summary.points,
        holes_completed: summary.holes_completed,
        picked_up_count: summary.picked_up_count,
        front9_gross: nine_gross(&scored, 1, 9),
        back9_gross: nine_gross(&scored, 10, 18),
        holes: scored,
    }
}

fn nine_gross(holes: &[HoleScoreOut], from: i32, to: i32) -> Option<i32> {
    let slice: Vec<_> = holes
        .iter()
        .filter(|h| h.hole >= from && h.hole <= to)
        .collect();
    if slice.len() != 9 {
        return None;
    }
    if slice.iter().any(|h| h.strokes.is_none()) {
        return None;
    }
    Some(slice.iter().map(|h| h.strokes.unwrap()).sum())
}

pub fn summarise(round: &RoundRow, holes: &[HoleScoreOut]) -> RoundSummary {
    let played: Vec<_> = holes.iter().filter(|h| h.strokes.is_some()).collect();
    let holes_completed = played.len() as i32;
    let picked_up_count = holes.iter().filter(|h| h.picked_up).count() as i32;
    let played_gross: i32 = played.iter().map(|h| h.strokes.unwrap_or(0)).sum();
    let played_adjusted: i32 = played
        .iter()
        .map(|h| {
            let strokes = h.strokes.unwrap_or(0);
            let cap = h.par + 2 + h.strokes_received;
            strokes.min(cap)
        })
        .sum();
    let played_par: i32 = played.iter().map(|h| h.par).sum();
    let played_vs_par = played_gross - played_par;
    let gross = if holes_completed == 18 {
        Some(played_gross)
    } else {
        None
    };
    let vs_par = gross.map(|g| g - 72);
    let points = played.iter().map(|h| h.points).sum();
    RoundSummary {
        id: round.id,
        player_id: round.player_id,
        played_on: round.played_on.clone(),
        tee: round.tee.clone(),
        format: round.format.clone(),
        handicap_index: round.handicap_index,
        playing_handicap: round.playing_handicap,
        gross,
        vs_par,
        points,
        holes_completed,
        played_gross,
        played_adjusted,
        played_vs_par,
        picked_up_count,
    }
}

fn mean(xs: &[f64]) -> Option<f64> {
    if xs.is_empty() {
        None
    } else {
        Some(xs.iter().sum::<f64>() / xs.len() as f64)
    }
}

/// Compared with the shots received on that hole.
/// −0.3 or better is attack. +0.5 or worse is survival. Between those is play to handicap.
fn strategy(avg_vs_shots: Option<f64>, completed: i32) -> String {
    if completed < 2 {
        return "Need more data".into();
    }
    let v = avg_vs_shots.unwrap_or(99.0);
    // The cutoffs are not exact in binary, so a hair on the line still counts as the line.
    if v <= -0.3 + 1e-6 {
        "Attack".into()
    } else if v >= 0.5 - 1e-6 {
        "Survival".into()
    } else {
        "Play to handicap".into()
    }
}

pub fn compute_stats(course: &CourseFile, rounds: &[(RoundRow, Vec<HoleScoreOut>)]) -> StatsOut {
    let mut summaries: Vec<RoundSummary> = rounds
        .iter()
        .map(|(r, h)| summarise(r, h))
        .collect();
    summaries.sort_by(|a, b| b.played_on.cmp(&a.played_on).then(b.id.cmp(&a.id)));

    let complete: Vec<i32> = summaries.iter().filter_map(|s| s.gross).collect();
    let points: Vec<i32> = summaries
        .iter()
        .filter(|s| s.holes_completed == 18)
        .map(|s| s.points)
        .collect();
    let front: Vec<f64> = rounds
        .iter()
        .filter_map(|(_, h)| nine_gross(h, 1, 9).map(|n| n as f64))
        .collect();
    let back: Vec<f64> = rounds
        .iter()
        .filter_map(|(_, h)| nine_gross(h, 10, 18).map(|n| n as f64))
        .collect();

    let mut hole_stats = Vec::new();
    for card in &course.holes {
        let mut grosses = Vec::new();
        let mut pts = Vec::new();
        let mut played = 0;
        let mut pickups = 0;
        let mut birdies = 0;
        let mut pars = 0;
        let mut bogeys = 0;
        let mut doubles = 0;
        let mut fir_att = 0;
        let mut fir_hit = 0;
        let mut gir_att = 0;
        let mut gir_hit = 0;
        let mut putts = Vec::new();
        let mut vs_shots = Vec::new();
        let mut shots = Vec::new();

        let mut recent: Vec<(&str, i64, &HoleScoreOut)> = rounds
            .iter()
            .filter_map(|(round, holes)| {
                let h = holes.iter().find(|h| h.hole == card.number)?;
                if h.strokes.is_none() {
                    return None;
                }
                Some((round.played_on.as_str(), round.id, h))
            })
            .collect();
        recent.sort_by(|a, b| b.0.cmp(a.0).then(b.1.cmp(&a.1)));
        recent.truncate(10);

        for (_, _, h) in recent {
            played += 1;
                pts.push(h.points as f64);
                if h.picked_up {
                    pickups += 1;
                }
                if let Some(s) = h.strokes {
                    grosses.push(s);
                    let vs = s - card.par;
                    vs_shots.push((vs - h.strokes_received) as f64);
                    shots.push(h.strokes_received as f64);
                    if vs <= -1 {
                        birdies += 1;
                    } else if vs == 0 {
                        pars += 1;
                    } else if vs == 1 {
                        bogeys += 1;
                    } else {
                        doubles += 1;
                    }
                }
                if let Some(fir) = &h.fir {
                    if fir != "na" {
                        fir_att += 1;
                        if fir == "hit" {
                            fir_hit += 1;
                        }
                    }
                }
                if let Some(gir) = h.gir {
                    gir_att += 1;
                    if gir {
                        gir_hit += 1;
                    }
                }
            if let Some(p) = h.putts {
                putts.push(p as f64);
            }
        }

        let completed = grosses.len() as i32;
        let avg_gross = mean(&grosses.iter().map(|g| *g as f64).collect::<Vec<_>>());
        let avg_vs_par = avg_gross.map(|g| g - card.par as f64);
        let avg_vs_shots = mean(&vs_shots);
        hole_stats.push(HoleStats {
            number: card.number,
            par: card.par,
            stroke_index: card.stroke_index,
            yards_white: card.yards.white,
            yards_yellow: card.yards.yellow,
            yards_blue: card.yards.blue,
            played,
            completed,
            pickups,
            avg_gross,
            best: grosses.iter().copied().min(),
            worst: grosses.iter().copied().max(),
            avg_points: mean(&pts),
            avg_vs_par,
            avg_vs_shots,
            avg_shots: mean(&shots),
            birdies_or_better: birdies,
            pars,
            bogeys,
            doubles_plus: doubles,
            fir_attempts: fir_att,
            fir_hits: fir_hit,
            gir_attempts: gir_att,
            gir_hits: gir_hit,
            avg_putts: mean(&putts),
            strategy: strategy(avg_vs_shots, completed),
        });
    }

    let mut ranked: Vec<_> = hole_stats
        .iter()
        .filter(|h| h.completed >= 2)
        .collect();
    ranked.sort_by(|a, b| {
        b.avg_vs_shots
            .unwrap_or(-99.0)
            .partial_cmp(&a.avg_vs_shots.unwrap_or(-99.0))
            .unwrap()
    });
    let problem_holes: Vec<i32> = ranked.iter().take(3).map(|h| h.number).collect();
    ranked.sort_by(|a, b| {
        a.avg_vs_shots
            .unwrap_or(99.0)
            .partial_cmp(&b.avg_vs_shots.unwrap_or(99.0))
            .unwrap()
    });
    let scoring_holes: Vec<i32> = ranked.iter().take(3).map(|h| h.number).collect();

    StatsOut {
        round_count: summaries.len() as i32,
        complete_gross_count: complete.len() as i32,
        avg_gross: mean(&complete.iter().map(|g| *g as f64).collect::<Vec<_>>()),
        best_gross: complete.iter().copied().min(),
        worst_gross: complete.iter().copied().max(),
        avg_points: mean(&points.iter().map(|p| *p as f64).collect::<Vec<_>>()),
        best_points: points.iter().copied().max(),
        avg_front9: mean(&front),
        avg_back9: mean(&back),
        last_round: summaries.first().cloned(),
        holes: hole_stats,
        problem_holes,
        scoring_holes,
    }
}

pub fn hole_history(scored: &[(RoundRow, Vec<HoleScoreOut>)], hole: i32) -> Vec<HoleHistoryPoint> {
    let mut points: Vec<HoleHistoryPoint> = scored
        .iter()
        .filter_map(|(round, holes)| {
            let h = holes.iter().find(|h| h.hole == hole)?;
            let strokes = h.strokes?;
            let vs_par = h.vs_par?;
            Some(HoleHistoryPoint {
                round_id: round.id,
                played_on: round.played_on.clone(),
                tee: round.tee.clone(),
                strokes,
                vs_par,
                points: h.points,
            })
        })
        .collect();
    points.sort_by(|a, b| a.played_on.cmp(&b.played_on).then(a.round_id.cmp(&b.round_id)));
    let start = points.len().saturating_sub(10);
    points.split_off(start)
}

#[cfg(test)]
mod tests {
    use super::strategy;

    #[test]
    fn attack_at_minus_0_3_survival_at_plus_0_5() {
        assert_eq!(strategy(Some(-0.3), 2), "Attack");
        assert_eq!(strategy(Some(-0.29), 2), "Play to handicap");
        assert_eq!(strategy(Some(0.0), 2), "Play to handicap");
        assert_eq!(strategy(Some(0.49), 2), "Play to handicap");
        assert_eq!(strategy(Some(0.5), 2), "Survival");
        assert_eq!(strategy(Some(0.0), 1), "Need more data");
    }
}
