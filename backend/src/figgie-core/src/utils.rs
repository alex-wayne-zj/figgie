use crate::types::Quote;

pub fn find_matching_quote_idx(
    quotes: &[Quote],
    new_quote: &Quote,
) -> Option<usize> {
    quotes.iter().position(|q|
        q.player_id != new_quote.player_id &&
        q.suit == new_quote.suit &&
        q.price == new_quote.price &&
        q.side != new_quote.side
    )
}