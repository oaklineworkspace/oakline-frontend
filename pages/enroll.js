// pages/enroll.js
import { useState } from "react";

export default function EnrollPage() {
  const [formData, setFormData] = useState({
    email: "",
    lastName: "",
    ssn: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/request-enroll`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            last_name: formData.lastName,
            ssn: formData.ssn,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Enrollment failed");
      }

      setMessage("✅ Enrollment request submitted successfully!");
    } catch (err) {
      console.error(err);
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "2rem auto" }}>
      <h1>Online Banking Enrollment</h1>
      <form onSubmit={handleSubmit}>
        <label>Email:</label>
        <input
          type="email"
          name="email"
          required
          value={formData.email}
          onChange={handleChange}
        />
        <br />

        <label>Last Name:</label>
        <input
          type="text"
          name="lastName"
          required
          value={formData.lastName}
          onChange={handleChange}
        />
        <br />

        <label>SSN (Last 4 digits):</label>
        <input
          type="text"
          name="ssn"
          required
          maxLength={4}
          value={formData.ssn}
          onChange={handleChange}
        />
        <br />

        <button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit Enrollment"}
        </button>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
}
