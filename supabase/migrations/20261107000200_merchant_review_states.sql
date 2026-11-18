-- Merchant applications get a real review workflow: under review, information requested, rejected.
-- In a file of its own because Postgres can't use a new enum value in the transaction that adds it.
-- Safe to run twice.
alter type merchant_status add value if not exists 'under_review' after 'pending_verification';
alter type merchant_status add value if not exists 'info_required' after 'under_review';
alter type merchant_status add value if not exists 'rejected' after 'info_required';
-- A business that has registered but not yet sent its application (documents still to upload).
alter type merchant_status add value if not exists 'draft' before 'pending_verification';
