// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// Validación de variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// src/components/FileUploader.tsx
// ... (mantener el código anterior hasta la parte de supabase)

        // Create bundle record
        const { data: bundle, error: bundleError } = await supabase
          .from('bundles99')
          .insert({
            job_number: jobNumber,
            file_name: file.name,
            total_members: members.length,
            total_studs: members.filter(m => m.type.toLowerCase() === 'stud').length
          })
          .select()
          .single();

        if (bundleError) throw bundleError;

        // Insert members
        const { error: membersError } = await supabase
          .from('members99')
          .insert(
            members.map(member => ({
              ...member,
              bundle_id: bundle.id
            }))
          );

// src/pages/index.tsx
// ... (mantener el código anterior hasta loadBundles)

  const loadBundles = async () => {
    const { data, error } = await supabase
      .from('bundles99')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) {
      setBundles(data);
    }
  };

// src/pages/bundles/[id].tsx
// ... (mantener el código anterior hasta loadBundleData)

  const loadBundleData = async () => {
    try {
      setLoading(true);
      
      // Load bundle info
      const { data: bundleData } = await supabase
        .from('bundles99')
        .select('*')
        .eq('id', id)
        .single();
      
      // Load members
      const { data: membersData } = await supabase
        .from('members99')
        .select('*')
        .eq('bundle_id', id);
      
      setBundle(bundleData);
      setMembers(membersData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
