// pages/enroll.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { supabase } from "../lib/supabaseClient";
import Link from "next/link";

export default function Enroll() {
  const router = useRouter();

  const [ssn, setSSN] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState("");

  // --------- Fetch matching application ---------
  useEffect(() => {
    if (ssn.length !== 4) {
      setApplication(null);
      return;
    }

    const fetchApp = async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("id, first_name, last_name, email, accounts(id, account_number, account_type, balance)")
        .eq("ssn", ssn)
        .single();

      if (error || !data) setApplication(null);
      else setApplication(data);
    };

    const debounce = setTimeout(fetchApp, 500);
    return () => clearTimeout(debounce);
  }, [ssn]);

  // --------- Password strength check ---------
  useEffect(() => {
    if (!password) return setPasswordStrength("");
    if (password.length < 8) setPasswordStrength("Weak");
    else if (password.match(/(?=.*[0-9])(?=.*[!@#$%^&*])/))
      setPasswordStrength("Strong");
    else setPasswordStrength("Medium");
  }, [password]);

  // --------- Handle enrollment ---------
  const handleEnroll = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!ssn || !email || !password || !confirmPassword) {
      setMessage("⚠️ All fields are required.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("⚠️ Passwords do not match.");
      return;
    }
    if (!application) {
      setMessage("❌ SSN not found or no linked accounts.");
      return;
    }

    setLoading(true);

    try {
      // Check if already enrolled
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingProfile) {
        setMessage("⚠️ This email is already enrolled. Please login.");
        setLoading(false);
        return;
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setMessage("❌ " + authError.message);
        setLoading(false);
        return;
      }

      const userId = authData.user.id;

      // Create profile linked to auth user
      const { error: profileError } = await supabase.from("profiles").insert([
        {
          id: userId,
          email,
          ssn,
          enrollment_completed: true,
        },
      ]);

      if (profileError) {
        setMessage("❌ Error creating profile: " + profileError.message);
        setLoading(false);
        return;
      }

      // Link accounts to user
      await supabase
        .from("accounts")
        .update({ user_id: userId })
        .eq("application_id", application.id);

      setMessage("✅ Enrollment successful! You can now login.");
      setSSN("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setApplication(null);
      setLoading(false);

      // Redirect after short delay
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      console.error(err);
      setMessage("❌ An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Enroll - Oakline Bank</title>
      </Head>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">
            Enroll for Online Access
          </h1>

          {message && (
            <div
              className={`p-3 mb-4 rounded-md text-sm border ${
                message.includes("✅")
                  ? "bg-green-100 border-green-400 text-green-800"
                  : "bg-red-100 border-red-400 text-red-800"
              }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleEnroll} className="space-y-4">
            <div>
              <label className="block font-semibold mb-1">
                SSN (Last 4 digits) *
              </label>
              <input
                type="password"
                value={ssn}
                onChange={(e) => setSSN(e.target.value)}
                placeholder="1234"
                maxLength={4}
                className="w-full p-3 border rounded-md"
                required
              />
            </div>

            {application && application.accounts.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-md text-sm text-blue-800">
                <p>Accounts linked to this SSN:</p>
                <ul className="list-disc pl-5 mt-1">
                  {application.accounts.map((acc) => (
                    <li key={acc.id}>
                      {acc.account_type.toUpperCase()} • #{acc.account_number} •
                      Balance: ${acc.balance.toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <label className="block font-semibold mb-1">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full p-3 border rounded-md"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Password *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="w-full p-3 border rounded-md"
                required
              />
              {password && (
                <p
                  className={`mt-1 text-sm ${
                    passwordStrength === "Weak"
                      ? "text-red-600"
                      : passwordStrength === "Medium"
                      ? "text-yellow-600"
                      : "text-green-600"
                  }`}
                >
                  Strength: {passwordStrength}
                </p>
              )}
            </div>

            <div>
              <label className="block font-semibold mb-1">
                Confirm Password *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="********"
                className="w-full p-3 border rounded-md"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full p-3 bg-blue-800 text-white rounded-md mt-2 hover:bg-blue-900 transition"
            >
              {loading ? "Processing..." : "Enroll"}
            </button>
          </form>

          <p className="mt-4 text-sm text-center">
            Already enrolled?{" "}
            <Link href="/login" className="text-blue-600 underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
