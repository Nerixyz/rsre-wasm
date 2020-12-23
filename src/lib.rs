use wasm_bindgen::prelude::*;
use regex::{Regex, Error, Match};
use std::collections::HashMap;
use serde::{Serialize};
use wasm_bindgen::__rt::core::fmt::{Display, Formatter};

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;


fn to_wasm(e: regex::Error) -> JsValue {
    match e {
        Error::Syntax(s) => JsValue::from(s),
        Error::CompiledTooBig(limit) => JsValue::from(format!("Exceeded limit of {} characters", limit)),
        Error::__Nonexhaustive => JsValue::from("Destructuring is non-exhaustive"),
    }
}

#[derive(Serialize)]
pub struct RegexExecResponse<'a> {
    matches: Vec<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    groups: Option<HashMap<String, &'a str>>,
    index: usize,
    input: &'a str
}

pub enum WasmFnReturn<T> {
    Null,
    Value(T),
    Error(String)
}

impl<T> From<Box<dyn std::error::Error>> for WasmFnReturn<T> {
    fn from(e: Box<dyn std::error::Error>) -> Self {
        Self::Error(e.to_string())
    }
}

impl<T> ToString for WasmFnReturn<T> where T: Serialize {
    fn to_string(&self) -> String {
        match self {
            WasmFnReturn::Error(e) =>
                serde_json::to_string(&RustToJsError {
                    error: e.to_string()
                }).unwrap_or_else(|_| "null".to_owned()),
            WasmFnReturn::Null => "null".to_owned(),
            WasmFnReturn::Value(v) => match serde_json::to_string(v) {
                Ok(json) => json,
                Err(e) => to_js_error(e)
            }
        }
    }
}

#[wasm_bindgen]
pub struct RegexWrapper {
    regex: Regex,
    flags: String,
    source: String,
    #[wasm_bindgen(js_name = "lastIndex")]
    pub last_index: usize,
    #[wasm_bindgen(js_name = "dotAll")]
    pub dot_all: bool,
    pub global: bool,
    #[wasm_bindgen(js_name = "ignoreCase")]
    pub ignore_case: bool,
    pub multiline: bool,
    pub sticky: bool,
    pub unicode: bool,
}

#[wasm_bindgen]
impl RegexWrapper {
    fn convert_to_rust_regex(js: String) -> String {
        js.replace("(?<", "(?P<")
    }

    // TODO: Remove this as a constructor and construct the value in the glue-code as this may throw
    #[wasm_bindgen(constructor)]
    pub fn new(expr: String, flags: Option<String>) -> Result<RegexWrapper, JsValue> {
        let source = expr.clone();
        let (expr, flags, (dot_all, global, ignore_case, multiline, sticky, unicode)) = if let Some(flags) = flags {
            let rust_flags = flags.replace('g', "").replace('y', "");
            let expr = if rust_flags.is_empty() { expr } else { format!("(?{}){}", rust_flags, expr) };
            let parsed_flags = (
                flags.contains('s'),
                flags.contains('g'),
                flags.contains('i'),
                flags.contains('m'),
                flags.contains('y'),
                flags.contains('u')
            );
            (expr, flags, parsed_flags)
        } else { (expr, "".to_owned(), (false, false, false, false, false, false)) };
        // in this case we want to clone, because we've modified the expression/source
        let regex = Regex::new(&Self::convert_to_rust_regex(expr.clone())).map_err(to_wasm)?;
        Ok(Self {
            regex,
            source,
            last_index: 0,
            flags,
            dot_all, global, ignore_case, multiline, sticky, unicode
        })
    }

    pub fn test(&self, target: &str) -> bool {
        self.regex.is_match(target)
    }

    fn exec_raw<'a>(&self, target: &'a str) -> (WasmFnReturn<RegexExecResponse<'a>>, Option<usize>) {
        let length = target.len();
        if self.last_index > length {
            return (WasmFnReturn::Null, if self.global || self.sticky { Some(0) } else {None} )
        }
        let matched = if self.sticky {
            self.sticky_match(target, self.last_index)
        } else {
            self.regex.find_at(target, self.last_index)
        };
        match matched {
            None => {
                return (WasmFnReturn::Null,  if self.sticky { Some(0) } else {None})
            }
            Some(matched) =>
                (WasmFnReturn::Value(if let Some(captures) = self.regex.captures(matched.as_str()) {
                    let matches: Vec<serde_json::Value> = captures.iter().map(|o| match o {
                        Some(m) => serde_json::Value::from(m.as_str()),
                        None => serde_json::Value::Null
                    }).collect();
                    let map: HashMap<String, &str> = self.regex.capture_names()
                        .flatten()
                        .filter_map(|n| Some((n.to_string(), captures.name(n)?.as_str())))
                        .collect();
                    RegexExecResponse {
                        index: matched.start(),
                        matches,
                        input: target,
                        groups: if map.is_empty() {None} else {Some(map)}
                    }
                } else {
                    RegexExecResponse {
                        index: matched.start(),
                        matches: vec![serde_json::Value::from(matched.as_str())],
                        input: target,
                        groups: None
                    }
                }),
                 if self.global || self.sticky {
                    Some(matched.end())
                } else {
                     None
                 })

        }
    }

    pub fn exec(&mut self, target: &str) -> String {
        let (result, idx) = self.exec_raw(target);
        if let Some(idx) = idx {
            self.last_index = idx;
        }
        result.to_string()
    }

    fn match_symbol_raw<'a>(&'a mut self, target: &'a str) -> WasmFnReturn<Vec<String>> {
        self.last_index = 0;
        let mut results = vec![];
        loop {
            let (result, idx) = self.exec_raw(target);
            if let Some(idx) = idx { self.last_index = idx; }

            match result {
                WasmFnReturn::Null => break,
                WasmFnReturn::Value(v) => {
                    let matched = match v.matches.get(0) {
                        None => return WasmFnReturn::Error("Matches were empty - expected at least one match".to_string()),
                        // &&str
                        Some(v) => v.as_str().unwrap_or("").to_string()
                    };
                    results.push(matched);
                },
                // "rethrow" the error
                WasmFnReturn::Error(e) => return WasmFnReturn::Error(e)
            };
        }
        if results.is_empty() {
            WasmFnReturn::Null
        } else {
            WasmFnReturn::Value(results)
        }
    }
    #[wasm_bindgen(js_name = "matchSymbol")]
    pub fn match_symbol(&mut self, target: &str) -> String {
        if self.global {
            self.match_symbol_raw(target).to_string()
        } else {
            self.exec(target)
        }
    }

    fn match_all_symbol_raw<'a>(&'a mut self, target: &'a str) -> WasmFnReturn<Vec<RegexExecResponse<'a>>> {
        let prev_idx = self.last_index;
        let mut results = vec![];
        loop {
            let (result, idx) = self.exec_raw(target);
            if let Some(idx) = idx { self.last_index = idx; }
            match result {
                WasmFnReturn::Null => break,
                WasmFnReturn::Value(v) => {
                    results.push(v);
                },
                // "rethrow" the error
                WasmFnReturn::Error(e) => {
                    return WasmFnReturn::Error(e)
                }
            };
        }
        self.last_index = prev_idx;
        // always return a vec
        WasmFnReturn::Value(results)
    }

    #[wasm_bindgen(js_name = "matchAllSymbol")]
    pub fn match_all_symbol(&mut self, target: &str) -> String {
        if !self.global {
            return WasmFnReturn::<()>::Error("The Regex has to be global".to_owned()).to_string()
        }
        let res = self.match_all_symbol_raw(target);

        res.to_string()
    }

    /// Runs a sticky match on the string `s` at `last_index`. The matched string has to start at `last_index`.
    fn sticky_match<'a>(&self, s: &'a str, last_index: usize) -> Option<Match<'a>> {
        self.regex.find_at(s, last_index).filter(|m| m.start() == last_index)
    }

    #[wasm_bindgen(getter)]
    pub fn flags(&self) -> String {
        self.flags.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn source(&self) -> String {
        self.source.clone()
    }
}

#[derive(Serialize, Debug)]
pub struct RustToJsError {
    error: String
}

impl RustToJsError {
    pub fn new(s: &str) -> RustToJsError {
        RustToJsError {
            error: s.to_string()
        }
    }
}

impl Display for RustToJsError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.error)
    }
}

impl std::error::Error for RustToJsError{}

fn to_js_error<E: std::error::Error>(e: E) -> String {
    serde_json::to_string(&RustToJsError {
        error: e.to_string()
    }).unwrap_or_else(|_| "null".to_owned())
}
