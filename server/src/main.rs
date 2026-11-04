mod api;
mod db;
mod models;
mod stableford;
mod stats;

use anyhow::{Context, Result};
use api::AppState;
use axum::Router;
use models::CourseFile;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::{ServeDir, ServeFile};

fn data_dir() -> PathBuf {
    for c in [PathBuf::from("data"), PathBuf::from("../data")] {
        if c.join("batchworth-park.json").exists() {
            return c;
        }
    }
    PathBuf::from("data")
}

fn web_dist() -> Option<PathBuf> {
    for c in [PathBuf::from("web/dist"), PathBuf::from("../web/dist")] {
        if c.join("index.html").exists() {
            return Some(c);
        }
    }
    None
}

#[tokio::main]
async fn main() -> Result<()> {
    let data = data_dir();
    let course_path = data.join("batchworth-park.json");
    let raw = std::fs::read_to_string(&course_path)
        .with_context(|| format!("read {}", course_path.display()))?;
    let course: CourseFile = serde_json::from_str(&raw).context("parse course json")?;

    let db_path = data.join("golf.db");
    let conn = db::open(db_path.to_str().unwrap())?;

    let state = AppState {
        db: Arc::new(Mutex::new(conn)),
        course: Arc::new(course),
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let mut app = Router::new()
        .nest("/api", api::router())
        .layer(cors)
        .with_state(state);

    if let Some(dist) = web_dist() {
        let index = dist.join("index.html");
        app = app.fallback_service(ServeDir::new(dist).fallback(ServeFile::new(index)));
    }

    let addr = SocketAddr::from(([127, 0, 0, 1], 8787));
    println!("golf-strategy listening on http://{addr}");
    println!("course data: {}", course_path.display());
    let listener = TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
