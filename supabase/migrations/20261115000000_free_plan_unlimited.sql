-- Migration: Free-Tarif vorerst ohne Limits (Produkt ist bis zum ersten zahlenden Kunden kostenlos)
-- Rueckgängig machen, sobald Bezahlung eingefuehrt wird:
--   update public.plans set max_students = 5, max_teachers = 2 where key = 'free';
update public.plans set max_students = null, max_teachers = null where key = 'free';
