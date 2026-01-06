-- RPC Function to increment participant stats after a match
CREATE OR REPLACE FUNCTION increment_participant_stats(
    p_tournament_id UUID,
    p_user_id UUID,
    p_wins NUMERIC,
    p_spread INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE tournament_participants
    SET 
        wins = wins + p_wins,
        spread = spread + p_spread
    WHERE tournament_id = p_tournament_id AND user_id = p_user_id;
END;
$$;
