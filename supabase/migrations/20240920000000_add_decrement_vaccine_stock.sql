-- Create the decrement_vaccine_stock function
CREATE OR REPLACE FUNCTION public.decrement_vaccine_stock(
  p_vaccine_id UUID,
  p_amount INTEGER DEFAULT 1
) RETURNS INTEGER AS $$
DECLARE
  current_stock INTEGER;
  new_stock INTEGER;
BEGIN
  -- Get current stock level
  SELECT stocks_left INTO current_stock
  FROM public.vaccines
  WHERE id = p_vaccine_id
  FOR UPDATE;  -- Lock the row for update

  -- If vaccine not found, raise an exception
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vaccine with ID % not found', p_vaccine_id;
  END IF;

  -- Calculate new stock level
  new_stock := GREATEST(0, current_stock - p_amount);

  -- Update the stock
  UPDATE public.vaccines
  SET 
    stocks_left = new_stock,
    updated_at = NOW()
  WHERE id = p_vaccine_id;

  -- Return the new stock level
  RETURN new_stock;
EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise the exception
    RAISE EXCEPTION 'Error updating vaccine stock: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.decrement_vaccine_stock(UUID, INTEGER) TO authenticated;
