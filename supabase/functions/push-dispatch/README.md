# push-dispatch

Sends the push copy of a customer's in-app notification (points earned, reward redeemed, points expired…) to their
phones through Expo's push service.

- **Called by:** a database webhook (Dashboard → Database → Webhooks) on `notifications` **INSERT**, type Supabase
  Edge Functions, function `push-dispatch`, HTTP header `apikey` = the project's secret key (as `notify-merchant-signup`).
- **Reads:** `push_payload(id)` (service role only): title, body, data, whether the customer allows that kind
  (`customer_profiles.notify_points / notify_expiry / notify_offers`), and their Expo tokens (`push_tokens`, written
  by the app through `register_push_token`). Marks the row with `mark_pushed(id)` so a repeat sends nothing.
- **Secrets:** optional `EXPO_ACCESS_TOKEN` (only if "enhanced push security" is on in the Expo account). Delivery to
  iPhones needs the APNs key uploaded to the EAS project (`eas credentials`), an owner step.
- **Answers** `{ sent: n }` or `{ sent: 0, reason }` (`not_in_app`, `already_pushed`, `not_allowed`, `no_tokens`,
  `expo_<status>`, `expo_unreachable`); never an error for a valid webhook.
