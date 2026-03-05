"use client";

import GoogleButton from "@/shared/components/GoogleButton";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";

enum Step {
  EMAIL = "email",
  OTP = "otp",
}

type SignupFormData = {
  name: string;
  email: string;
  password: string;
  rememberMe: boolean;
};

const SignWithEmailForm = ({onSubmit}: {onSubmit: (data: SignupFormData) => Promise<void>}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>();

  const onSubmitHandler = async (data: SignupFormData) => {
    setServerError(null);
    setIsLoading(true);
    try {
      await onSubmit(data);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      if (error instanceof AxiosError) {
        setServerError(error.response?.data.message || 'Something went wrong. Please try again.');
        return;
      }
      setServerError("Something went wrong. Please try again.");
    } 
  }

  
  return <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-4">
        {serverError && (
          <p className="text-sm text-red-500">{serverError}</p>
        )}

        <div>
          <label className="block text-gray-700 font-medium mb-1">Name</label>
          <input
            type="text"
            placeholder="Enter your name"
            className="w-full px-4 py-2 font-poppins font-medium border border-gray-300 outline-none rounded-md focus:ring-1 focus:ring-[#3489FF]"
            {...register("name", {
              required: "Name is required",
            })}
          />
          {errors.name && (
            <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full px-4 py-2 font-poppins font-medium border border-gray-300 outline-none rounded-md focus:ring-1 focus:ring-[#3489FF]"
            {...register("email", {
              required: "Email is required",
              pattern: {
                value: /^\S+@\S+$/i,
                message: "Invalid email address",
              },
            })}
          />
          {errors.email && (
            <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">
            Password
          </label>
          <div className="relative">
            <input
              type={isPasswordVisible ? "text" : "password"}
              placeholder="Enter your password"
              className="w-full px-4 py-2 font-poppins font-medium border border-gray-300 outline-none rounded-md focus:ring-1 focus:ring-[#3489FF] pr-10"
              {...register("password", {
                required: "Password is required",
              })}
            />
            <button
              type="button"
              onClick={() => setIsPasswordVisible(!isPasswordVisible)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            >
              {isPasswordVisible ? (
                <EyeOff size={20} />
              ) : (
                <Eye size={20} />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-500 mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 border-gray-300"
              {...register("rememberMe")}
            />
            <span className="text-gray-700 text-sm">Remember me</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-blue-500 text-sm hover:underline"
          >
            Forgot Password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "Signing up..." : "Sign up"}
        </button>
      </form>
}

const OtpVerficationForm = ({onSubmit, onResendOTP}: {onSubmit: (otp: string) => Promise<void>, onResendOTP: () => Promise<void>}) => {
  const OTP_LENGTH = 4;
  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''));
  const [timer, setTimer] = useState(60);
  const inputRefs = useRef<HTMLInputElement[]>([]);

  const isComplete = otp.join("").length === OTP_LENGTH;

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (timer <= 0) {
        clearInterval(interval);
        return;
      }
      setTimer(timer - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer])

  const handleResendOTP = () => {
    onResendOTP();
    setTimer(60);
  }

  const handleSubmit = () => {
    if (!isComplete) return;
    onSubmit(otp.join(""));
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const rawValue = e.target.value;
    const digit = rawValue.trim().slice(-1);
    if (digit !== "" && (digit < '0' || digit > '9')) return;
    
    setOtp(prev => {
      const newOtp = [...prev];
      newOtp[index] = digit;
      return newOtp;
    });

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = [...e.clipboardData.getData("text")]
      .filter((c) => c >= "0" && c <= "9")
      .slice(0, OTP_LENGTH)
    if (pasted.length === 0) return;

    const newOtp = new Array(OTP_LENGTH).fill('');
    pasted.forEach((char, i) => { newOtp[i] = char; });
    setOtp(newOtp);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  return (
    <div className="space-y-4 flex flex-col items-center justify-center">
      <label className="block text-gray-700 font-medium mb-1">OTP</label>
      <div className="flex items-center gap-2">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={el => { el && (inputRefs.current[index] = el); }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={digit}
            onChange={(e) => onChange(e, index)}
            onKeyDown={(e) => onKeyDown(e, index)}
            onPaste={onPaste}
            aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
            className="w-10 h-10 text-center border border-gray-300 rounded-md focus:ring-1 focus:ring-[#3489FF]"
          />
        ))}
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isComplete}
        className="w-full block py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Verify
      </button>
      <button
        type="button"
        disabled={timer > 0}
        onClick={ handleResendOTP}
        className="w-full block py-3 font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {timer > 0 ? `Resend OTP in ${timer} seconds` : "Resend OTP"}
      </button>
    </div>
  );
}


const SignupPage = () => {
  const [step, setStep] = useState<Step>(Step.EMAIL);
  const [userInput, setUserInput] = useState<SignupFormData>();

  const signupMutation = useMutation({
    mutationFn: async (userInput: SignupFormData) => {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URI}/api/user-registeration`, userInput);
      return response.data;
    }, 
    onSuccess: (_, userInput) => {
      setUserInput(userInput);
      setStep(Step.OTP);
    }
  })

  return (
    <div className="w-full py-10 min-h-[85vh] bg-[#f1f1f1]">
      <h1 className="text-4xl font-poppins font-semibold text-black text-center">
        Signup
      </h1>
      <p className="text-center text-lg font-medium py-3 text-[#00000099]">
        Home . Signup
      </p>
      <div className="w-full flex justify-center">
        <div className="w-full md:w-[480px] p-8 bg-white shadow rounded-lg">
          <h3 className="text-3xl font-semibold mb-2 text-center">
            Signup to Eshopy
          </h3>
          <p className="text-center text-gray-500 mb-4">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-500">
              Login
            </Link>
          </p>

          <GoogleButton />

          <div className="flex items-center my-5 text-gray-400 text-sm">
            <div className="flex-1 border-t border-gray-300" />
            <span className="px-3">or Sign up with Email</span>
            <div className="flex-1 border-t border-gray-300" />
          </div>

            {step === Step.EMAIL && <SignWithEmailForm onSubmit={signupMutation.mutateAsync} />}
            {step === Step.OTP && <OtpVerficationForm onSubmit={async (otp: string) => {}} onResendOTP={async () => {}} />} 
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
