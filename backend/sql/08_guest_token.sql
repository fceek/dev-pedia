-- Guest Token for Public Access
-- Creates a special 'guest' token with classification level 1
-- Token value: 'guest'
-- SHA-512 hash of 'guest': b0e0ec7fa0a89577c9341c16cff870789221b310a02cc465f464789407f83f377a87a97d635cac2666147a8fb5fd27d56dea3d4ceba1fc7d02f422dda6794e3c

-- Insert guest token
INSERT INTO tokens (
    token_hash,
    classification_level,
    status,
    name,
    description,
    created_by,
    expires_at
) VALUES (
    'b0e0ec7fa0a89577c9341c16cff870789221b310a02cc465f464789407f83f377a87a97d635cac2666147a8fb5fd27d56dea3d4ceba1fc7d02f422dda6794e3c',  -- SHA-512 of 'guest'
    1,                      -- Classification level 1
    'active',               -- Always active
    'Guest Access',         -- Human-readable name
    'Public guest access token for level 1 content',  -- Description
    NULL,                   -- No creator (special system token)
    NULL                    -- Never expires
)
ON CONFLICT (token_hash) DO NOTHING;  -- Don't re-insert if already exists
