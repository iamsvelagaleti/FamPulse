# FamPulse

A family management web application built with React, Vite, Supabase, and TailwindCSS. Manage your family members with role-based access control.

## 🎯 Features

- ✅ User Authentication (Sign up / Sign in)
- ✅ Family Creation & Management
- ✅ Role-Based Access Control (Admin, Admin Lite, Kid)
- ✅ Invite Code System
- ✅ Family Member Management
- ✅ Secure Row Level Security (RLS)

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI Framework
- **Vite 7** - Build Tool & Dev Server
- **TailwindCSS 3** - Styling
- **React Router DOM** - Navigation (ready to use)

### Backend
- **Supabase** - Backend as a Service
    - PostgreSQL Database
    - Authentication
    - Real-time Subscriptions
    - Row Level Security

### Development
- **Node.js 25.2.1**
- **npm 11.6.2**
- **IntelliJ IDEA Ultimate**

## 📊 Database Schema

### Tables

#### 1. `profiles`
User profile information linked to Supabase Auth.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  date_of_birth DATE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. `families`
Family groups with unique invite codes.

```sql
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. `family_members`
Links users to families with role-based access.

```sql
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'admin_lite', 'kid')),
  added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_family_members_family_id ON family_members(family_id);
CREATE INDEX idx_family_members_user_id ON family_members(user_id);
CREATE INDEX idx_families_invite_code ON families(invite_code);
```

### Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Admin** | Full control: add/remove anyone, change roles, delete family |
| **Admin Lite** | Can add/remove/manage kids only, view all members |
| **Kid** | Read-only access to family members |

## 🔒 Security Implementation

### Row Level Security (RLS)

All tables have RLS enabled with the following policies:

#### Helper Functions

```sql
-- Check if user is a member of a family
CREATE OR REPLACE FUNCTION is_family_member(p_family_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM family_members
    WHERE family_id = p_family_id
    AND user_id = auth.uid()
  );
END;
$$;

-- Get user's role in a family
CREATE OR REPLACE FUNCTION get_user_family_role(p_family_id UUID, p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM family_members
  WHERE family_id = p_family_id
  AND user_id = p_user_id;
  
  RETURN user_role;
END;
$$;
```

#### Profiles Policies

```sql
-- Everyone can view all profiles (for displaying family members)
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

#### Families Policies

```sql
-- Users can view families they belong to
CREATE POLICY "Users can view their families"
  ON families FOR SELECT
  USING (is_family_member(id));

-- Anyone can create a family
CREATE POLICY "Users can create families"
  ON families FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Only admins can update family details
CREATE POLICY "Admins can update families"
  ON families FOR UPDATE
  USING (get_user_family_role(id, auth.uid()) = 'admin');

-- Only admins can delete families
CREATE POLICY "Admins can delete families"
  ON families FOR DELETE
  USING (get_user_family_role(id, auth.uid()) = 'admin');
```

#### Family Members Policies

```sql
-- Users can view members of their families
CREATE POLICY "Users can view family members"
  ON family_members FOR SELECT
  USING (is_family_member(family_id));

-- Family creator OR admins/admin_lites can add members
CREATE POLICY "Admins can add members"
  ON family_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM families
      WHERE id = family_members.family_id
      AND created_by = auth.uid()
    )
    OR
    get_user_family_role(family_members.family_id, auth.uid()) IN ('admin', 'admin_lite')
  );

-- Admins can update any member, Admin Lites can update kids only
CREATE POLICY "Admins can update members"
  ON family_members FOR UPDATE
  USING (
    CASE get_user_family_role(family_id, auth.uid())
      WHEN 'admin' THEN true
      WHEN 'admin_lite' THEN role = 'kid'
      ELSE false
    END
  );

-- Admins can delete any member (except themselves), Admin Lites can delete kids only
CREATE POLICY "Admins can delete members"
  ON family_members FOR DELETE
  USING (
    user_id != auth.uid()
    AND
    CASE get_user_family_role(family_id, auth.uid())
      WHEN 'admin' THEN true
      WHEN 'admin_lite' THEN role = 'kid'
      ELSE false
    END
  );
```

### Automatic Triggers

```sql
-- Auto-generate invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER families_invite_code BEFORE INSERT ON families
  FOR EACH ROW EXECUTE FUNCTION set_invite_code();

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_members_updated_at BEFORE UPDATE ON family_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 🚀 Setup Instructions

### Prerequisites

- Node.js (v20+)
- npm (v10+)
- Supabase Account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/iamsvelagaleti/FamPulse.git
   cd fam-pulse
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
    - Create a new project at [supabase.com](https://supabase.com)
    - Copy your project URL and anon key

4. **Configure environment variables**

   Create `.env` file in the root:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Run database migrations**

   Go to Supabase Dashboard → SQL Editor and run all the SQL scripts from the "Database Schema" and "Security Implementation" sections above in this order:

   a. Create tables (profiles, families, family_members)
   b. Create helper functions
   c. Enable RLS and create policies
   d. Create triggers

6. **Start development server**
   ```bash
   npm run dev
   ```

7. **Open browser**

   Navigate to `http://localhost:5173`

## 📁 Project Structure

```
fam-pulse/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   └── AuthForm.jsx          # Login/Signup form
│   │   └── family/
│   │       └── FamilyDashboard.jsx   # Family management UI
│   ├── contexts/
│   │   └── AuthContext.jsx           # Authentication state management
│   ├── hooks/
│   │   └── useFamily.jsx             # Family data & operations hook
│   ├── App.jsx                       # Main app component
│   ├── main.jsx                      # Entry point
│   ├── supabaseClient.js             # Supabase client configuration
│   └── index.css                     # Global styles (Tailwind)
├── public/                           # Static assets
├── .env                              # Environment variables (not in git)
├── .gitignore
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## 🔄 Current User Flow

1. **Sign Up / Sign In**
    - User creates account or logs in
    - Profile automatically created in database

2. **Create Family**
    - User creates a family (becomes Admin)
    - Unique 8-character invite code generated
    - User automatically added as admin member

3. **View Family Dashboard**
    - See family name and invite code
    - View all family members
    - See role badges (Admin, Admin Lite, Kid)

4. **Manage Members** (based on role)
    - **Admin**: Can change roles, remove any member
    - **Admin Lite**: Can remove kids only
    - **Kid**: View-only access

## 🚧 Upcoming Features

- [ ] Add member by email functionality
- [ ] Join family via invite code
- [ ] Profile editing
- [ ] Avatar upload
- [ ] Family settings
- [ ] Transaction tracking (future)
- [ ] Budget management (future)

## 🔑 Environment Variables

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

## 🛡️ Security Notes

- All sensitive operations protected by Row Level Security
- Passwords hashed by Supabase Auth
- API keys use environment variables (not committed to git)
- Role-based permissions enforced at database level
- Kids cannot access financial data (future-proof)

## 📝 Development Notes

### Known Issues
- None currently

### Important SQL Relationships
- `family_members` has TWO foreign keys to `profiles`:
    - `user_id` (the member)
    - `added_by` (who added them)
- When querying, use `profiles!user_id` to specify which relationship

### Testing Credentials
Create your own test accounts via the signup form.

## 📄 License

MIT License - feel free to use for personal projects

## 👨💻 Author

Sandeep Velagaleti
- GitHub: [@iamsvelagaleti](https://github.com/iamsvelagaleti)
- Email: iamsandeep.sv@gmail.com

## 🙏 Acknowledgments

- Built with [Supabase](https://supabase.com)
- UI styled with [TailwindCSS](https://tailwindcss.com)
- Powered by [Vite](https://vitejs.dev)

---

**Last Updated:** December 11, 2025
