alter table public.listing_photos drop constraint listing_photos_position_check;
alter table public.listing_photos add constraint listing_photos_position_check check ("position" >= 1 and "position" <= 45);
