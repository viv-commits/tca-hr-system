# TCA HR Compliance System — Code Files
# The Care Advantage Ltd
# Generated: 17/04/2026
# ================================================================

## FILES IN THIS FOLDER
=====================

1. tca-admin-module.js          — Admin panel + User Permission Matrix
2. tca-rota-module.js           — Monthly rota grid (all homes)
3. tca-training-module.js       — Training matrix with expiry colour coding
4. tca-audit-module.js          — Audit log viewer (admin only)
5. tca-safer-recruitment-module.js — Safer recruitment document tracker
6. README.txt                   — This file (instructions)

## WHERE TO SAVE THESE FILES
============================

OPTION A - Netlify (RECOMMENDED - you already have this!)
----------------------------------------------------------
1. Go to https://app.netlify.com
2. Log in with your TCA account
3. Find your site "viv-tyjwnl8" (app.thecareadvantage.com)
4. Click "Deploys" > "Deploy settings" > "Drag and drop"
5. Drag ALL 5 .js files into the deploy folder
   (same folder as app.html - the root)
6. Wait 30 seconds - site auto-deploys
7. Done! Files live at app.thecareadvantage.com/tca-admin-module.js etc.

OPTION B - SharePoint (for backup/reference only)
--------------------------------------------------
Upload to: TCA HR Compliance > Code Files folder
NOTE: SharePoint cannot serve these files directly to the live app.
Use Netlify to actually deploy them.

OPTION C - GitHub (best for long term)
---------------------------------------
1. github.com > New repository > name: "tca-hr-system"
2. Upload all files
3. Connect GitHub to Netlify (Netlify > Site settings > Build & deploy)
4. Every time you update a file on GitHub, Netlify auto-deploys


## HOW TO ADD THESE TO app.html
================================

Open app.html in any text editor (Notepad works).
Find the closing </body> tag at the bottom.
Add these lines BEFORE </body>:

  <script src="tca-admin-module.js"></script>
  <script src="tca-rota-module.js"></script>
  <script src="tca-training-module.js"></script>
  <script src="tca-audit-module.js"></script>
  <script src="tca-safer-recruitment-module.js"></script>

Save app.html and re-upload it to Netlify with the .js files.


## SUPABASE FIXES NEEDED
========================

1. FIX: user_profiles RLS infinite recursion
   Go to: supabase.com > your project > SQL Editor
   Run this SQL:
   
   DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
   CREATE POLICY "Users can read own profile" ON user_profiles
     FOR SELECT USING (auth.uid() = id);

2. CREATE: staff_documents table (for permanent file storage)
   Run this SQL in Supabase SQL Editor:
   
   CREATE TABLE staff_documents (
     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
     org_id text DEFAULT 'TCA',
     staff_id integer REFERENCES staff(id) ON DELETE CASCADE,
     staff_name text,
     category text NOT NULL,
     doc_type text,
     filename text NOT NULL,
     file_size text,
     file_url text,
     uploaded_by text,
     reviewed boolean DEFAULT false,
     reviewed_by text,
     notes text,
     expiry_date date,
     created_at timestamptz DEFAULT now(),
     updated_at timestamptz DEFAULT now()
   );
   
   ALTER TABLE staff_documents ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Org members can read" ON staff_documents FOR SELECT USING (org_id = 'TCA');
   CREATE POLICY "Org members can insert" ON staff_documents FOR INSERT WITH CHECK (org_id = 'TCA');
   CREATE POLICY "Org members can update" ON staff_documents FOR UPDATE USING (org_id = 'TCA');

3. CREATE: Supabase Storage bucket for document files
   Go to: supabase.com > Storage > New bucket
   Name: staff-documents
   Set to: Private
   This allows actual PDF/image files to be stored server-side.


## LOGO
=======
Your TCA logo (navy C + "The Care Advantage" text) is already in:
SharePoint > Management Documents > 6. Marketing > Branding > LOGO Main.JPG

To use in the app: upload LOGO Main.JPG to Netlify root folder,
then reference it in app.html as: <img src="LOGO Main.JPG" ...>
Or rename to: tca-logo.jpg for cleaner URL.


## QUESTIONS?
=============
All navigation, permissions, safer recruitment, rota, training and audit
log pages are working in the current browser session.

These module files make those changes PERMANENT - they will survive
page reloads and work for all staff on any device.

Contact your web developer with this README to implement the Supabase fixes.


# Linked to Netlify via GitHub on 22/04/2026
