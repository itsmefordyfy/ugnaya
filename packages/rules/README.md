# @ugnaya/rules

Pure TypeScript mirrors of the points rules. At runtime the SQL functions in
`supabase/migrations` are the authority (`points_for_amount`, `verify_member_code`); these mirrors
let the apps preview and validate the same way, and both sides are tested with the same vectors:

| Rule | Input | Result |
| --- | --- | --- |
| per peso, 1 per ₱10 | ₱200.00 (20000) | 20 |
| network, 1 per ₱20 | ₱250.00 (25000) | 12 |
| per peso, 1 per ₱10 | ₱199.50 (19950) | 19 (floor, never round up) |
| per peso, 1 per ₱10, minimum ₱100 | ₱99.99 (9999) | 0 |
| per visit, 5 points | ₱0.01 (1) | 5 |
| stamps, minimum ₱50 | ₱50.00 (5000) | 1 |
| per peso with a unit of 0 | any | error |
| TOTP (RFC 6238, SHA-1), secret `12345678901234567890` | T = 59 s | `287082` |
| TOTP, same secret | T = 1111111109 s | `081804` |

Offers: a network offer is within the guideline when its retail value is 2% to 3% of the spend
needed to earn its points (₱60 for 120 network points is 2.5%).
