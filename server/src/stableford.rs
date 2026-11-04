/// Course handicap for 18 holes, rounded to the nearest whole number.
/// (index × slope / 113) + (course rating − par)
pub fn course_handicap(index: f64, slope: i32, course_rating: f64, par: i32) -> i32 {
    let raw = index * (slope as f64 / 113.0) + (course_rating - par as f64);
    raw.round() as i32
}

/// Strokes received on a hole from playing handicap and men's stroke index (1–18).
/// Handicap 18 = 1 on every hole; 19 = 2 on SI 1 and 1 elsewhere; 5 = 1 on SI 1–5.
pub fn strokes_received(playing_handicap: i32, stroke_index: i32) -> i32 {
    if playing_handicap <= 0 {
        return 0;
    }
    let base = playing_handicap / 18;
    let extra = playing_handicap % 18;
    if extra > 0 && stroke_index <= extra {
        base + 1
    } else {
        base
    }
}

/// Stableford points vs par using net score. Net double-bogey or worse is 0.
pub fn points_from_net(par: i32, net: i32) -> i32 {
    (2 - (net - par)).max(0)
}

pub fn hole_points(
    par: i32,
    stroke_index: i32,
    playing_handicap: i32,
    strokes: Option<i32>,
    picked_up: bool,
) -> i32 {
    if picked_up {
        return 0;
    }
    let Some(strokes) = strokes else {
        return 0;
    };
    let received = strokes_received(playing_handicap, stroke_index);
    points_from_net(par, strokes - received)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn white_index_14_7_is_course_handicap_17() {
        assert_eq!(course_handicap(14.7, 133, 71.5, 72), 17);
    }

    #[test]
    fn yellow_index_19_3_is_course_handicap_20() {
        assert_eq!(course_handicap(19.3, 127, 70.0, 72), 20);
    }

    #[test]
    fn handicap_zero_gets_nothing() {
        assert_eq!(strokes_received(0, 1), 0);
        assert_eq!(strokes_received(0, 18), 0);
    }

    #[test]
    fn handicap_five_on_hardest_holes() {
        assert_eq!(strokes_received(5, 1), 1);
        assert_eq!(strokes_received(5, 5), 1);
        assert_eq!(strokes_received(5, 6), 0);
        assert_eq!(strokes_received(5, 18), 0);
    }

    #[test]
    fn handicap_eighteen_everywhere() {
        for si in 1..=18 {
            assert_eq!(strokes_received(18, si), 1);
        }
    }

    #[test]
    fn handicap_nineteen_two_on_si_one() {
        assert_eq!(strokes_received(19, 1), 2);
        assert_eq!(strokes_received(19, 2), 1);
        assert_eq!(strokes_received(19, 18), 1);
    }

    #[test]
    fn net_par_is_two_points() {
        assert_eq!(points_from_net(4, 4), 2);
        assert_eq!(points_from_net(3, 2), 3);
        assert_eq!(points_from_net(5, 7), 0);
        assert_eq!(points_from_net(4, 5), 1);
    }

    #[test]
    fn pickup_is_zero() {
        assert_eq!(hole_points(4, 1, 18, None, true), 0);
    }

    #[test]
    fn gross_par_with_a_stroke_is_birdie_points() {
        // par 4, SI 9, PH 12 → 1 received, gross 4 → net 3 → 3 points
        assert_eq!(hole_points(4, 9, 12, Some(4), false), 3);
    }
}
