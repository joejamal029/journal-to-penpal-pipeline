pub mod format1;
pub mod format2;
pub mod format3;

use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use std::path::Path;
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ThoughtUnit {
    pub id: String,
    pub date: Option<String>, // ISO date "YYYY-MM-DD"
    pub content: String,
    pub category: String, // "presence" | "reminiscence" | "uncategorized"
    pub source_file_path: String,
    pub source_line_number: i32,
    pub format_version: i32,
    pub created_at: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FormatVersion {
    Format1 = 1,
    Format2 = 2,
    Format3 = 3,
}

/// Helper function to detect the format variant of a journal file.
/// Score against each format pattern based on research findings:
/// - Format 3 (newest): Look for "#presence" or "#reminiscence" tags.
/// - Format 1 (oldest): Look for bullet markers ("- ", "* ", "• ") starting lines.
/// - Format 2 (middle): Default fallback (newline-delimited, date headers only).
pub fn detect_format(content: &str) -> FormatVersion {
    if content.contains("#presence") || content.contains("#reminiscence") {
        FormatVersion::Format3
    } else if content.lines().any(|l| {
        let trimmed = l.trim_start();
        trimmed.starts_with("- ") || trimmed.starts_with("* ") || trimmed.starts_with("• ")
    }) {
        FormatVersion::Format1
    } else {
        FormatVersion::Format2
    }
}

/// Helper function to parse dates using chrono with multiple formats.
pub fn parse_date(date_str: &str) -> Option<NaiveDate> {
    let normalized = date_str.trim();
    let chars: Vec<char> = normalized.chars().collect();
    let mut normalized_str = String::new();
    let mut i = 0;
    while i < chars.len() {
        if i + 2 < chars.len() 
            && chars[i] == ' ' 
            && chars[i+1].is_ascii_digit() 
            && (chars[i+2] == ',' || chars[i+2] == ' ')
            && (i == 0 || chars[i-1] != ' ')
        {
            normalized_str.push(' ');
            normalized_str.push('0');
            normalized_str.push(chars[i+1]);
            i += 2;
        } else {
            normalized_str.push(chars[i]);
            i += 1;
        }
    }

    let formats = [
        "%Y-%m-%d",
        "%B %d, %Y",
        "%d/%m/%Y",
        "%d %B %Y",
        "%B %d, %a, %Y",
        "%B %e, %a, %Y",
    ];
    formats.iter()
        .find_map(|fmt| NaiveDate::parse_from_str(normalized_str.trim(), fmt).ok())
}

/// Helper function to extract a date from a filename (e.g., "journal-2024-05-12.md" -> "2024-05-12").
pub fn extract_date_from_filename(file_path: &str) -> Option<String> {
    let path = Path::new(file_path);
    let filename = path.file_name()?.to_str()?;
    
    // Scan for YYYY-MM-DD pattern
    for i in 0..=filename.len().checked_sub(10).unwrap_or(0) {
        if let Some(sub) = filename.get(i..i+10) {
            // Ensure the match starts with a digit to avoid parsing leading hyphens as negative years (e.g. "-2024-05-1")
            if sub.chars().next().map_or(false, |c| c.is_ascii_digit()) {
                if let Ok(date) = NaiveDate::parse_from_str(sub, "%Y-%m-%d") {
                    return Some(date.format("%Y-%m-%d").to_string());
                }
            }
        }
    }
    None
}

/// Master function to parse any journal file.
/// Detects format and routes to the appropriate parser.
/// If parsing fails or yields no dated entries, fallback is triggered.
pub fn parse_journal(
    content: &str,
    file_path: &str,
) -> (Vec<ThoughtUnit>, FormatVersion, Vec<String>) {
    let mut file_date = None;
    let mut parsed_content = content;

    if let Some(first_line) = content.lines().next() {
        let trimmed = first_line.trim();
        if trimmed.starts_with("### ") {
            let date_candidate = trimmed["### ".len()..].trim();
            if let Some(parsed) = parse_date(date_candidate) {
                file_date = Some(parsed.format("%Y-%m-%d").to_string());
                if let Some(pos) = content.find('\n') {
                    parsed_content = &content[pos + 1..];
                } else {
                    parsed_content = "";
                }
            }
        }
    }

    let file_date = file_date.or_else(|| extract_date_from_filename(file_path));
    let format = detect_format(parsed_content);
    
    let mut warnings = Vec::new();
    let mut thought_units = match format {
        FormatVersion::Format3 => format3::parse(parsed_content, file_path, file_date.as_deref()),
        FormatVersion::Format1 => format1::parse(parsed_content, file_path, file_date.as_deref()),
        FormatVersion::Format2 => format2::parse(parsed_content, file_path, file_date.as_deref()),
    };

    // If the parsed count is 0 and it has date headers, or if we have general content
    // we can attempt a Best-Effort unstructured fallback if we didn't get any entries.
    if thought_units.is_empty() && !parsed_content.trim().is_empty() {
        // Fallback: treat each non-empty line as uncategorized thought-unit
        let created_at = chrono::Local::now().to_rfc3339();
        for (i, line) in parsed_content.lines().enumerate() {
            let line_content = line.trim();
            if !line_content.is_empty() {
                thought_units.push(ThoughtUnit {
                    id: Uuid::new_v4().to_string(),
                    date: file_date.clone(),
                    content: line_content.to_string(),
                    category: "uncategorized".to_string(),
                    source_file_path: file_path.to_string(),
                    source_line_number: (i + 1) as i32,
                    format_version: format as i32,
                    created_at: created_at.clone(),
                });
            }
        }
        warnings.push(format!(
            "File '{}' parsed as unstructured fallback — some entries may be missing dates.",
            Path::new(file_path).file_name().unwrap_or_default().to_string_lossy()
        ));
    }

    // Count undated entries to warn user (PRD criteria)
    let undated_count = thought_units.iter().filter(|tu| tu.date.is_none()).count();
    if undated_count > 0 && !thought_units.is_empty() {
        warnings.push(format!(
            "{} entries could not be dated.",
            undated_count
        ));
    }

    (thought_units, format, warnings)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_format() {
        let f3_content = "## 2024-05-12\n#presence\nSome thought\n#reminiscence\nAnother thought";
        assert_eq!(detect_format(f3_content), FormatVersion::Format3);

        let f1_content = "## 2024-05-12\n- A bullet point\n* Another bullet";
        assert_eq!(detect_format(f1_content), FormatVersion::Format1);

        let f2_content = "## 2024-05-12\nJust plain paragraph text\nNo bullet points";
        assert_eq!(detect_format(f2_content), FormatVersion::Format2);
    }

    #[test]
    fn test_parse_date() {
        assert_eq!(parse_date("2024-05-12"), Some(NaiveDate::from_ymd_opt(2024, 5, 12).unwrap()));
        assert_eq!(parse_date("May 12, 2024"), Some(NaiveDate::from_ymd_opt(2024, 5, 12).unwrap()));
        assert_eq!(parse_date("12/05/2024"), Some(NaiveDate::from_ymd_opt(2024, 5, 12).unwrap()));
        assert_eq!(parse_date("12 May 2024"), Some(NaiveDate::from_ymd_opt(2024, 5, 12).unwrap()));
        assert_eq!(parse_date("March 11, Mon, 2024"), Some(NaiveDate::from_ymd_opt(2024, 3, 11).unwrap()));
        assert_eq!(parse_date("March 9, Sat, 2024"), Some(NaiveDate::from_ymd_opt(2024, 3, 9).unwrap()));
        assert_eq!(parse_date("not a date"), None);
    }

    #[test]
    fn test_extract_date_from_filename() {
        assert_eq!(
            extract_date_from_filename("C:/Users/USER/journal-2024-05-12.md"),
            Some("2024-05-12".to_string())
        );
        assert_eq!(
            extract_date_from_filename("journal_entry.txt"),
            None
        );
    }

    #[test]
    fn test_extract_date_from_file_header() {
        let content_with_header = "### March 11, Mon, 2024\n* Woke up quite early, played pes.";
        let (units, format, _warnings) = parse_journal(content_with_header, "C:/Users/USER/journal.md");
        
        assert_eq!(format, FormatVersion::Format1);
        assert!(!units.is_empty());
        assert_eq!(units[0].date, Some("2024-03-11".to_string()));
        assert_eq!(units[0].content, "Woke up quite early, played pes.");

        // Also test single digit day equivalent
        let content_single_digit = "### March 9, Sat, 2024\n* Woke up quite early, played pes.";
        let (units_sd, _, _) = parse_journal(content_single_digit, "C:/Users/USER/journal.md");
        assert!(!units_sd.is_empty());
        assert_eq!(units_sd[0].date, Some("2024-03-09".to_string()));
    }
}
