const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://inbvyxdyeushatmbfvim.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluYnZ5eGR5ZXVzaGF0bWJmdmltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NzgxMTgsImV4cCI6MjA5MTI1NDExOH0.NNHWlSnOZ5PlT6e-BYbVTKQE2QX80C1RaUf8NWe4ATE');

supabase.from('tabela_inicial').select('*').limit(1).then(({ data, error }) => {
  if (error) { console.error("Error:", error); }
  else if (data && data.length > 0) {
    console.log("COLUMNS FOUND:", Object.keys(data[0]));
  } else {
    console.log("No data found");
  }
});
