-- Add Malayalam localization columns to categories
ALTER TABLE categories
ADD COLUMN name_ml VARCHAR(255),
ADD COLUMN description_ml TEXT;

-- Update existing categories with a placeholder if needed, though they can be null for now.
-- Ideally we will populate this with translations.

-- Add Malayalam localization columns to subcategories
ALTER TABLE subcategories
ADD COLUMN name_ml VARCHAR(255),
ADD COLUMN category_name_ml VARCHAR(255);
