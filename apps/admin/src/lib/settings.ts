/** The platform settings the portal edits, with the same bounds admin_set_setting enforces. */
export const INTEGER_SETTINGS = [
  { key: 'void_window_hours', label: 'Cashier void window', unit: 'hours', min: 1, max: 72, help: 'How long a cashier may void their own transaction on the same device.' },
  { key: 'manager_void_window_days', label: 'Manager void window', unit: 'days', min: 1, max: 90, help: 'How long an owner or manager may void a transaction.' },
  { key: 'redemption_token_minutes', label: 'Redemption code lifetime', unit: 'minutes', min: 1, max: 30, help: 'How long a customer’s redemption QR stays valid.' },
  { key: 'network_hold_days', label: 'Network points hold', unit: 'days', min: 0, max: 30, help: 'Days before network points earned become spendable.' },
  { key: 'web_code_minutes', label: 'Web code lifetime', unit: 'minutes', min: 1, max: 30, help: 'How long a one-time web code stays valid.' },
] as const;
