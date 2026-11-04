use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CourseFile {
    pub club: String,
    pub course: String,
    pub location: String,
    pub par: i32,
    pub tees: Vec<TeeFile>,
    pub holes: Vec<HoleFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeeFile {
    pub id: String,
    pub name: String,
    pub course_rating: Option<f64>,
    pub slope_rating: Option<i32>,
    #[serde(default)]
    pub par: Option<i32>,
    pub yards_total: i32,
    pub yards_out: i32,
    pub yards_in: i32,
    pub default: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HoleFile {
    pub number: i32,
    pub par: i32,
    pub stroke_index: i32,
    pub yards: HoleYards,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HoleYards {
    pub white: i32,
    pub yellow: i32,
    pub blue: i32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CoursePublic {
    pub club: String,
    pub course: String,
    pub location: String,
    pub par: i32,
    pub tees: Vec<TeePublic>,
    pub holes: Vec<HolePublic>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TeePublic {
    pub id: String,
    pub name: String,
    pub course_rating: Option<f64>,
    pub slope_rating: Option<i32>,
    pub yards_total: i32,
    pub default: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HolePublic {
    pub number: i32,
    pub par: i32,
    pub stroke_index: i32,
    pub yards: HoleYards,
}

impl From<&CourseFile> for CoursePublic {
    fn from(c: &CourseFile) -> Self {
        CoursePublic {
            club: c.club.clone(),
            course: c.course.clone(),
            location: c.location.clone(),
            par: c.par,
            tees: c
                .tees
                .iter()
                .filter(|t| t.id == "white" || t.id == "yellow" || t.id == "blue")
                .map(|t| TeePublic {
                    id: t.id.clone(),
                    name: t.name.clone(),
                    course_rating: t.course_rating,
                    slope_rating: t.slope_rating,
                    yards_total: t.yards_total,
                    default: t.default,
                })
                .collect(),
            holes: c
                .holes
                .iter()
                .map(|h| HolePublic {
                    number: h.number,
                    par: h.par,
                    stroke_index: h.stroke_index,
                    yards: h.yards.clone(),
                })
                .collect(),
        }
    }
}

impl CourseFile {
    pub fn hole(&self, number: i32) -> Option<&HoleFile> {
        self.holes.iter().find(|h| h.number == number)
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HoleScoreIn {
    pub hole: i32,
    pub strokes: Option<i32>,
    #[serde(default)]
    pub picked_up: bool,
    pub putts: Option<i32>,
    pub fir: Option<String>,
    pub gir: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RoundIn {
    pub player_id: i64,
    pub played_on: String,
    pub tee: String,
    pub format: String,
    pub handicap_index: f64,
    pub playing_handicap: i32,
    pub notes: Option<String>,
    pub holes: Vec<HoleScoreIn>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerOut {
    pub id: i64,
    pub name: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HoleScoreOut {
    pub hole: i32,
    pub par: i32,
    pub stroke_index: i32,
    pub yards: i32,
    pub strokes: Option<i32>,
    pub picked_up: bool,
    pub putts: Option<i32>,
    pub fir: Option<String>,
    pub gir: Option<bool>,
    pub strokes_received: i32,
    pub net: Option<i32>,
    pub points: i32,
    pub vs_par: Option<i32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoundOut {
    pub id: i64,
    pub player_id: i64,
    pub played_on: String,
    pub tee: String,
    pub format: String,
    pub handicap_index: f64,
    pub playing_handicap: i32,
    pub notes: Option<String>,
    pub gross: Option<i32>,
    pub vs_par: Option<i32>,
    pub points: i32,
    pub holes_completed: i32,
    pub picked_up_count: i32,
    pub front9_gross: Option<i32>,
    pub back9_gross: Option<i32>,
    pub holes: Vec<HoleScoreOut>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoundSummary {
    pub id: i64,
    pub player_id: i64,
    pub played_on: String,
    pub tee: String,
    pub format: String,
    pub handicap_index: f64,
    pub playing_handicap: i32,
    pub gross: Option<i32>,
    pub vs_par: Option<i32>,
    pub points: i32,
    pub holes_completed: i32,
    pub played_gross: i32,
    pub played_vs_par: i32,
    pub picked_up_count: i32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HoleStats {
    pub number: i32,
    pub par: i32,
    pub stroke_index: i32,
    pub yards_white: i32,
    pub yards_yellow: i32,
    pub yards_blue: i32,
    pub played: i32,
    pub completed: i32,
    pub pickups: i32,
    pub avg_gross: Option<f64>,
    pub best: Option<i32>,
    pub worst: Option<i32>,
    pub avg_points: Option<f64>,
    pub avg_vs_par: Option<f64>,
    pub birdies_or_better: i32,
    pub pars: i32,
    pub bogeys: i32,
    pub doubles_plus: i32,
    pub fir_attempts: i32,
    pub fir_hits: i32,
    pub gir_attempts: i32,
    pub gir_hits: i32,
    pub avg_putts: Option<f64>,
    pub strategy: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatsOut {
    pub round_count: i32,
    pub complete_gross_count: i32,
    pub avg_gross: Option<f64>,
    pub best_gross: Option<i32>,
    pub worst_gross: Option<i32>,
    pub avg_points: Option<f64>,
    pub best_points: Option<i32>,
    pub avg_front9: Option<f64>,
    pub avg_back9: Option<f64>,
    pub last_round: Option<RoundSummary>,
    pub holes: Vec<HoleStats>,
    pub problem_holes: Vec<i32>,
    pub scoring_holes: Vec<i32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HoleHistoryPoint {
    pub round_id: i64,
    pub played_on: String,
    pub tee: String,
    pub strokes: i32,
    pub vs_par: i32,
    pub points: i32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DefaultsOut {
    pub handicap_index: Option<f64>,
    pub playing_handicap: i32,
    pub tee: String,
    pub format: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_batchworth_card() {
        let raw = include_str!("../../data/batchworth-park.json");
        let c: CourseFile = serde_json::from_str(raw).unwrap();
        assert_eq!(c.holes.len(), 18);
        assert_eq!(c.hole(3).unwrap().stroke_index, 1);
        assert_eq!(c.hole(3).unwrap().yards.white, 439);
    }
}
