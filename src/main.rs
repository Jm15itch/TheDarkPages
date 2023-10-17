use std::ffi::OsStr;
use std::fs;
use walkdir::WalkDir;
use axum::{
    extract::Path as APath,
    routing::{get},
    response::{Html},
    Router,
};
use flurry::HashMap;
use once_cell::sync::Lazy;

#[derive(Default, Debug)]
struct Article {
    pub author: String,
    pub name: String,
    pub date: String, // Unix timestamp from epoch
    pub tags: String,
    pub html: String,
    pub dirname: String,
}

#[derive(Default)]
struct Cache {
    data: HashMap<String, Article>,
    directory: String, // The JSON data to be sent out
}

static GLOBAL_CACHE: Lazy<Cache> = Lazy::new(|| {
    println!("Generating cache now...");
    let mut directory: String = "[".to_string();
    let data = HashMap::new();
    for article in WalkDir::new("./articles").into_iter().filter_map(|e| e.ok()) {
        let mut article_data: Article = Article::default();
        article_data.dirname = article.file_name().to_string_lossy().to_string();
        let mut passes = 0;
        for file in WalkDir::new(article.path()).into_iter().filter_map(|e| e.ok()) { 
            if file.file_name() == OsStr::new("data.toml") {
                let tomldata = fs::read_to_string(file.path()).unwrap_or(String::new()).parse::<toml::Table>().unwrap_or(toml::Table::default());
                if tomldata.contains_key("name") && tomldata.contains_key("author") && tomldata.contains_key("date") && tomldata.contains_key("tags") {
                    article_data.name = tomldata["name"].as_str().unwrap_or("").to_string();
                    article_data.author = tomldata["author"].as_str().unwrap_or("").to_string();
                    article_data.date = tomldata["date"].as_str().unwrap_or("").to_string();
                    article_data.tags = tomldata["tags"].as_str().unwrap_or("").to_string();
                    passes = passes + 1;
                }
            } else if file.file_name() == OsStr::new("markup.html") {
                article_data.html = fs::read_to_string(file.path()).unwrap_or(String::new()).to_string();
                passes = passes + 1;
            }
        }
        if passes == 2 {
            println!("Successfully cached \x1b[35m{}\x1b[0m", article_data.name);
            data.pin().insert(article_data.dirname.clone(), article_data);
        }
    }
    for (index, article_data) in data.pin().iter().enumerate() {
        if index + 1 == data.pin().len() {
            directory = directory + format!("{{\"name\":\"{}\",\"dirname\":\"{}\",\"author\":\"{}\",\"date\":\"{}\",\"tags\":\"{}\"}}", article_data.1.name, article_data.1.dirname, article_data.1.author, article_data.1.date, article_data.1.tags).as_str();
        } else {
            directory = directory + format!("{{\"name\":\"{}\",\"dirname\":\"{}\",\"author\":\"{}\",\"date\":\"{}\",\"tags\":\"{}\"}},", article_data.1.name, article_data.1.dirname, article_data.1.author, article_data.1.date, article_data.1.tags).as_str();
        }
    }

    directory = directory + "]";

    Cache {
        data,
        directory,
    }
});

async fn get_article(APath(title): APath<String>) -> Html<String> {
    return Html(GLOBAL_CACHE.data.pin().get(&title).unwrap_or(&Article::default()).html.clone());
}

async fn article_directory() -> &'static str {
    GLOBAL_CACHE.directory.as_str()
}

async fn root() -> Html<&'static str> {
    Html(include_str!("www/index.html"))
}

async fn css() -> &'static str {
    include_str!("www/main.css")
}

async fn js() -> &'static str {
    include_str!("www/main.js")
}

async fn robots() -> &'static str {
"User-agent: *
Allow: /robots_directory"
}

#[tokio::main]
async fn main() {
    println!("Initalising server!");
    // build our application with a route
    let app = Router::new()
        // All static elements
        .route("/", get(root))
        .route("/main.css", get(css))
        .route("/main.js", get(js))
        // Article endpoints
        .route("/a/all", get(article_directory))
        .route("/a/:title", get(get_article))
        // SEO enhancements
        .route("/robots.txt", get(robots));

    // run our app with hyper, listening globally on port 3000
    axum::Server::bind(&"0.0.0.0:3000".parse().unwrap())
    .serve(app.into_make_service())
    .await
    .unwrap();
}
