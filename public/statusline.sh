#!/bin/sh
# ponytail: single jq invocation extracts and formats the statusline with colors
# ceiling: jq must be available in PATH.
exec jq -r '
  def k: if . >= 1000000 then ((. / 100000 | round) / 10 | tostring) + "M"
         elif . >= 1000 then ((. / 100 | round) / 10 | tostring) + "k"
         else tostring end;
  def pct_bar: (. * 100 | round) as $pct |
    ($pct / 10 | round) as $filled |
    ("   " + ($pct | tostring) | .[-3:]) + "% [" + ("█" * $filled) + ("░" * (10 - $filled)) + "]";
  def countdown:
    ([0, .] | max | . / 60 | ceil) as $minutes |
    ($minutes / 1440 | floor) as $days |
    ($minutes % 1440 / 60 | floor) as $hours |
    (if $days > 0 then "\($days)d " else "" end) +
    (if $hours > 0 then "\($hours)h " else "" end) + "\($minutes % 60)m";
  def reset_suffix:
    (try (.reset_time | fromdateiso8601) catch null) as $reset |
    (.reset_in_seconds // (if $reset != null then $reset - now else null end)) as $seconds |
    [
      (if $reset != null then "resets " + ($reset | strflocaltime("%a %d %b %H:%M")) else empty end),
      (if $seconds != null then "in " + ($seconds | countdown) else empty end)
    ] | if length > 0 then " (" + join(" · ") + ")" else "" end;
  def quota_color:
    if . <= 0.10 then "\u001b[0;31m"
    elif . <= 0.25 then "\u001b[0;33m" else "\u001b[0;32m" end;
  def context_color:
    if . >= 90 then "\u001b[0;31m"
    elif . >= 75 then "\u001b[0;33m" else "\u001b[0;90m" end;

  (.model.id // "") as $m |
  (if ($m | test("^(claude|gpt|o1|o3|3p)"; "i")) then "3p" else "gemini" end) as $p |

  [
    ([
      ((.workspace.project_dir // .workspace.current_dir // .cwd // empty) |
        sub("/+$"; "") | split("/") | last | select(length > 0) |
        "\u001b[0;34m" + . + "\u001b[0m"),
      ((.branch // .vcs.branch // empty) | "\u001b[0;36m" + . + "\u001b[0m"),
      ((.model.display_name // .model.id // empty) | "\u001b[0;35m" + . + "\u001b[0m")
    ] | join("\u001b[2m | \u001b[0m") | select(length > 0)),
    (
       ((.context_window.used_percentage // 0) / 100 | pct_bar) as $bar |
       ((.context_window.context_window_size // .context_window_size // 0) | k) as $sz |
       if $sz != "0" then (.context_window.used_percentage // 0 | context_color) + "ctx used:  " + $bar + " (" + $sz + ")\u001b[0m" else empty end
    ),
    (
      ([.quota[$p + "-5h"], .quota["gemini-5h"], .quota["3p-5h"], .quota["5h"], .quota.five_hour] | map(select(.remaining_fraction != null)) | .[0] // empty) |
       (.remaining_fraction | quota_color) + "5h left:   " + (.remaining_fraction | pct_bar) + reset_suffix + "\u001b[0m"
    ),
    (
      ([.quota[$p + "-weekly"], .quota["gemini-weekly"], .quota["3p-weekly"], .quota["weekly"], .quota.week] | map(select(.remaining_fraction != null)) | .[0] // empty) |
       (.remaining_fraction | quota_color) + "week left: " + (.remaining_fraction | pct_bar) + reset_suffix + "\u001b[0m"
    )
  ] | join("\n")
'
