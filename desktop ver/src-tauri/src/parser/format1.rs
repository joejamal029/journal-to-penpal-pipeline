use nom::{
    bytes::complete::tag,
    character::complete::{line_ending, not_line_ending, space0, anychar},
    combinator::opt,
    sequence::tuple,
    IResult, Parser,
};
use nom_locate::LocatedSpan;
use uuid::Uuid;
use super::{parse_date, ThoughtUnit, FormatVersion};

type Span<'a> = LocatedSpan<&'a str>;

#[derive(Debug)]
struct RawDateBlock {
    date_str: String,
    #[allow(dead_code)]
    date_line: i32,
    lines: Vec<(String, i32)>,
}

fn parse_date_header(input: Span) -> IResult<Span, (String, i32)> {
    let line_num = input.location_line() as i32;
    let (input, _) = tuple((tag("##"), space0)).parse(input)?;
    let (input, date_span) = not_line_ending(input)?;
    let (input, _) = opt(line_ending).parse(input)?;
    Ok((input, (date_span.fragment().trim().to_string(), line_num)))
}

fn parse_content_line(input: Span) -> IResult<Span, (Span, i32)> {
    let line_num = input.location_line() as i32;
    if input.fragment().starts_with("##") {
        return Err(nom::Err::Error(nom::error::Error::new(input, nom::error::ErrorKind::Tag)));
    }
    let (input, line_content) = not_line_ending(input)?;
    let (input, _) = opt(line_ending).parse(input)?;
    Ok((input, (line_content, line_num)))
}

fn parse_pre_header_block(input: Span) -> IResult<Span, Vec<(String, i32)>> {
    let mut lines = Vec::new();
    let mut remaining = input;
    while !remaining.fragment().is_empty() {
        if remaining.fragment().starts_with("##") {
            break;
        }
        match parse_content_line(remaining) {
            Ok((next_input, (line_content, line_num))) => {
                let content_str = line_content.fragment().trim().to_string();
                if !content_str.is_empty() {
                    lines.push((content_str, line_num));
                }
                remaining = next_input;
            }
            Err(_) => {
                let (next_input, _) = opt(line_ending).parse(remaining)?;
                if next_input == remaining {
                    let (next_input, _) = anychar(remaining)?;
                    remaining = next_input;
                } else {
                    remaining = next_input;
                }
            }
        }
    }
    Ok((remaining, lines))
}

fn parse_date_block(input: Span) -> IResult<Span, RawDateBlock> {
    let (input, (date_str, date_line)) = parse_date_header(input)?;
    let mut lines = Vec::new();
    let mut remaining = input;
    while !remaining.fragment().is_empty() {
        if remaining.fragment().starts_with("##") {
            break;
        }
        match parse_content_line(remaining) {
            Ok((next_input, (line_content, line_num))) => {
                let content_str = line_content.fragment().trim().to_string();
                if !content_str.is_empty() {
                    lines.push((content_str, line_num));
                }
                remaining = next_input;
            }
            Err(_) => {
                let (next_input, _) = opt(line_ending).parse(remaining)?;
                if next_input == remaining {
                    let (next_input, _) = anychar(remaining)?;
                    remaining = next_input;
                } else {
                    remaining = next_input;
                }
            }
        }
    }
    Ok((remaining, RawDateBlock { date_str, date_line, lines }))
}

pub fn parse(content: &str, file_path: &str, default_date: Option<&str>) -> Vec<ThoughtUnit> {
    let mut thought_units = Vec::new();
    let created_at = chrono::Local::now().to_rfc3339();
    let span = Span::new(content);

    // 1. Parse pre-header block (if any)
    let mut current_date = default_date.map(String::from);
    if let Ok((remaining, pre_lines)) = parse_pre_header_block(span) {
        for (line_str, line_num) in pre_lines {
            if let Some(clean) = clean_bullet(&line_str) {
                thought_units.push(ThoughtUnit {
                    id: Uuid::new_v4().to_string(),
                    date: current_date.clone(),
                    content: clean,
                    category: "uncategorized".to_string(),
                    source_file_path: file_path.to_string(),
                    source_line_number: line_num,
                    format_version: FormatVersion::Format1 as i32,
                    created_at: created_at.clone(),
                });
            }
        }

        // 2. Parse sequential date blocks
        let mut rem = remaining;
        while !rem.fragment().is_empty() {
            if rem.fragment().starts_with("##") {
                if let Ok((next_rem, block)) = parse_date_block(rem) {
                    if let Some(parsed_d) = parse_date(&block.date_str) {
                        current_date = Some(parsed_d.format("%Y-%m-%d").to_string());
                    }
                    
                    for (line_str, line_num) in block.lines {
                        if let Some(clean) = clean_bullet(&line_str) {
                            thought_units.push(ThoughtUnit {
                                id: Uuid::new_v4().to_string(),
                                date: current_date.clone(),
                                content: clean,
                                category: "uncategorized".to_string(),
                                source_file_path: file_path.to_string(),
                                source_line_number: line_num,
                                format_version: FormatVersion::Format1 as i32,
                                created_at: created_at.clone(),
                            });
                        }
                    }
                    rem = next_rem;
                } else {
                    // Safe break if it fails
                    break;
                }
            } else {
                // Consume blank lines/junk
                if let Ok((next_rem, _)) = anychar::<Span, nom::error::Error<Span>>(rem) {
                    rem = next_rem;
                } else {
                    break;
                }
            }
        }
    }

    thought_units
}

fn clean_bullet(line: &str) -> Option<String> {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return None;
    }
    let mut clean = trimmed;
    if trimmed.starts_with("- ") {
        clean = trimmed.strip_prefix("- ").unwrap().trim();
    } else if trimmed.starts_with("* ") {
        clean = trimmed.strip_prefix("* ").unwrap().trim();
    } else if trimmed.starts_with("• ") {
        clean = trimmed.strip_prefix("• ").unwrap().trim();
    }
    
    if clean.is_empty() {
        None
    } else {
        Some(clean.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format1_parser() {
        let content = "Some initial line\n## 2024-05-12\n- Bullet 1\n* Bullet 2\nNormal text\n## May 13, 2024\n• Bullet 3";
        let units = parse(content, "test.md", Some("2024-05-11"));
        
        assert_eq!(units.len(), 5);
        assert_eq!(units[0].content, "Some initial line");
        assert_eq!(units[0].date, Some("2024-05-11".to_string()));
        assert_eq!(units[0].source_line_number, 1);

        assert_eq!(units[1].content, "Bullet 1");
        assert_eq!(units[1].date, Some("2024-05-12".to_string()));
        assert_eq!(units[1].source_line_number, 3);

        assert_eq!(units[2].content, "Bullet 2");
        assert_eq!(units[2].date, Some("2024-05-12".to_string()));
        assert_eq!(units[2].source_line_number, 4);

        assert_eq!(units[3].content, "Normal text");
        assert_eq!(units[3].date, Some("2024-05-12".to_string()));
        assert_eq!(units[3].source_line_number, 5);

        assert_eq!(units[4].content, "Bullet 3");
        assert_eq!(units[4].date, Some("2024-05-13".to_string()));
        assert_eq!(units[4].source_line_number, 7);
    }
}
