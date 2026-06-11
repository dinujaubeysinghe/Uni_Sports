import { useState } from "react"
import { Link  } from "react-router-dom"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import bgImage from "../assets/registerLogin.jpg"

const API_BASE = (import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app").replace(/\/$/, "");



function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState("student")

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  })

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const validateEmail = (email) => {
    return email.endsWith("@my.sliit.lk")
  }

  const normalizePhone = (phone) => {
    const digits = phone.replace(/\D/g, "")

    // Accept +94XXXXXXXXX or 94XXXXXXXXX and normalize to 0XXXXXXXXX
    if (digits.length === 11 && digits.startsWith("94")) {
      return `0${digits.slice(2)}`
    }

    // Require exact 10 digits local mobile format e.g. 07XXXXXXXX
    if (digits.length === 10 && digits.startsWith("0")) {
      return digits
    }

    return null
  }

  const validatePhone = (phone) => {
    const normalized = normalizePhone(phone)
    return Boolean(normalized && /^07\d{8}$/.test(normalized))
  }

  const validatePassword = (password) => {
    return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
  }

  const handleSubmit = async(e) => {
    e.preventDefault()
    setError("");
    setSuccess("");

   
    if (!formData.name.trim()) {
      toast.error("Please fill valid fields: name is required")
      setError("Name is required")
      return
    }

    if (!validateEmail(formData.email)) {
      toast.error("Please fill valid fields: use your SLIIT email")
      setError("Please use your SLIIT email (@my.sliit.lk)")
      return
    }

    if (!validatePassword(formData.password)) {
      toast.error("Please fill valid fields: password must meet complexity requirements")
      setError("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Please fill valid fields: passwords do not match")
      setError("Passwords do not match")
      return
    }

    const normalizedPhone = normalizePhone(formData.phone);

    if (role === "coach" && !validatePhone(formData.phone)) {
      toast.error("Please fill valid fields: phone number must be exactly 10 digits (e.g., 0771234567)")
      setError("Please enter a valid phone number with exactly 10 digits (e.g., 0771234567)")
      return
    }

    console.log("Register Data:", { role, ...formData })

    setSuccess("Registration successful !")

    const payload = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role,
      phone: role === "coach" ? normalizedPhone : undefined,
    };

  try {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      setSuccess("Registration successful!");
      toast.success("Registration successful")
      
    } else {
      const errorMessage =
        data.message ||
        data.error ||
        "Registration failed";
      toast.error(errorMessage)
      setError(errorMessage);
    }
  } catch (error) {
    toast.error("Server error")
    setError("Server error");
  }

    setTimeout(() => {
    navigate("/auth/login")
  }, 1000)
    
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center"
        style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="bg-white/90 backdrop-blur-md shadow-2xl rounded-2xl p-8 w-full max-w-md">

        <h2 className="text-2xl font-bold text-center mb-6 text-indigo-950">
          Create Your Account
        </h2>

        {/* Role Toggle Buttons */}
        <div className="flex mb-6 bg-gray-100 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={`w-1/2 py-2 font-medium transition ${
              role === "student"
                ? "bg-indigo-950 text-white"
                : "text-gray-600"
            }`}
          >
            I am a Student
          </button>

          <button
            type="button"
            onClick={() => setRole("coach")}
            className={`w-1/2 py-2 font-medium transition ${
              role === "coach"
                ? "bg-indigo-950 text-white"
                : "text-gray-600"
            }`}
          >
            I am a Coach
          </button>
        </div>

        {error && (
          <div className="bg-red-100 text-red-600 p-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 text-green-600 p-2 rounded mb-4 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2">

          {/* Name */}
          <label className="block text-sm font-medium mb-1 text-black">
              Name 
            </label>
          <input
            type="text"
            name="name"
            placeholder="Enter your name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full border text-black border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-950"
          />

          {/* Email */}
          <label className="block text-sm font-medium mb-1 text-black">
              SLIIT Email
            </label>
          <input
            type="email"
            name="email"
            placeholder="Enter your SLIIT Email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full text-black border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-950"
          />

          {/* Phone (Only for Coach) */}
          {role === "coach" && (
          <label className="block text-sm font-medium mb-1 text-black">
              Phone Number
            </label>
          )}
          {role === "coach" && (
            
            <input
              type="tel"
              name="phone"
              placeholder="Phone Number "
              value={formData.phone}
              onChange={handleChange}
              className="w-full border text-black border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-950"
            />
          )}

          {/* Password */}
          <label className="block text-sm font-medium mb-1 text-black">
              Password
            </label>
          <input
            type="password"
            name="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full border text-black border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-950"
          />

          {/* Confirm Password */}
          <label className="block text-sm font-medium mb-1 text-black">
              Confirm Password
            </label>
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm your Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            className="w-full border text-black border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-950"
          /><br></br>
          

          <button
            type="submit"
            className="w-full bg-indigo-950 text-white py-2 rounded-lg hover:bg-indigo-900 transition font-semibold"
          >
            Register
          </button>
        </form>

        {/* Login Link */}
       
        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link
            to="/auth/login"
            className="text-indigo-900 font-medium hover:underline"
          >
            Login
          </Link>
        </p>

      </div>
    </div>
  )
}

export default Register