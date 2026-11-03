-- Migration: Chuẩn hóa 2 hóa đơn mẫu và 2 đơn hàng mẫu từ JPY sang USD ($5,800.00 và $4,500.00)
UPDATE dbo.transport_requests
SET estimated_amount = 5800.00, currency = 'USD'
WHERE request_id = 'F6000000-0000-0000-0000-000000000001';

UPDATE dbo.transport_requests
SET estimated_amount = 4500.00, currency = 'USD'
WHERE request_id = 'F6000000-0000-0000-0000-000000000002';

UPDATE dbo.invoices
SET amount = 5800.00, currency = 'USD'
WHERE invoice_id = '766212C3-BA61-42F5-8C10-49272161166E'
   OR request_id = 'F6000000-0000-0000-0000-000000000001';

UPDATE dbo.invoices
SET amount = 4500.00, currency = 'USD'
WHERE invoice_id = 'A4B211E0-D377-430D-8887-093622E77D83'
   OR request_id = 'F6000000-0000-0000-0000-000000000002';
