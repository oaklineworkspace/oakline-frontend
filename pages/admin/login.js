// Check if error indicates banned user
      if (authError.message && authError.message.toLowerCase().includes('banned')) {
        // Try to fetch ban reason from profile
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('ban_reason, is_banned')
            .eq('email', email)
            .single();

          if (profile && profile.is_banned && profile.ban_reason) {
            setError(profile.ban_reason);
          } else {
            setError('This admin account has been banned. Please contact the system administrator.');
          }
        } catch (err) {
          setError('This admin account has been banned. Please contact the system administrator.');
        }
        setLoading(false);
        return;
      }