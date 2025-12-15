-- Allow anyone to read pickup addresses (needed for drivers to see collection locations)
CREATE POLICY "Anyone can view pickup addresses"
ON b2b_pickup_addresses
FOR SELECT
USING (true);