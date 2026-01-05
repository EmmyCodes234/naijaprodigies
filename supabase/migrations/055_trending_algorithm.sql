-- Function to get trending topics based on recent activity
-- Counts distinct users posting about a tag in the last X hours

CREATE OR REPLACE FUNCTION get_trending_topics(
  hours_lookback int DEFAULT 24,
  limit_count int DEFAULT 5
)
RETURNS TABLE (
  tag text,
  count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pt.tag,
    COUNT(DISTINCT p.user_id) as count
  FROM
    post_tags pt
  JOIN
    posts p ON pt.post_id = p.id
  WHERE
    p.created_at >= NOW() - (hours_lookback || ' hours')::interval
  GROUP BY
    pt.tag
  ORDER BY
    count DESC
  LIMIT
    limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
