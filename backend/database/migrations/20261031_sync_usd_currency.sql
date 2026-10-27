-- Sync all historical currency data from JPY to USD
UPDATE transport_requests
SET currency = 'USD', estimated_amount = 16500.00
WHERE request_id = 'f6000000-0000-0000-0000-000000000001' AND (currency = 'JPY' OR estimated_amount > 100000);

UPDATE transport_requests
SET currency = 'USD', estimated_amount = 12000.00
WHERE request_id = 'f6000000-0000-0000-0000-000000000002' AND (currency = 'JPY' OR estimated_amount > 100000);

UPDATE transport_requests
SET currency = 'USD'
WHERE currency = 'JPY';

UPDATE invoices
SET currency = 'USD', amount = 16500.00
WHERE request_id = 'f6000000-0000-0000-0000-000000000001' AND (currency = 'JPY' OR amount > 100000);

UPDATE invoices
SET currency = 'USD', amount = 12000.00
WHERE request_id = 'f6000000-0000-0000-0000-000000000002' AND (currency = 'JPY' OR amount > 100000);

UPDATE invoices
SET currency = 'USD'
WHERE currency = 'JPY';

UPDATE transport_plans
SET status = N'Hoan thanh'
WHERE plan_id = '11a00000-0000-0000-0000-000000000001' AND (status = N'Dang thuc hien' OR status = N'in_progress');
