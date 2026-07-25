"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Mail, ArrowLeft, CheckCircle2, Truck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerDriverAction } from "@/actions/auth";
import { cn } from "@/lib/utils";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="normal-case tracking-normal text-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} {...props} className={cn("pr-10", props.className)} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function routeByRole(router: ReturnType<typeof useRouter>, userRole?: string) {
  const isManager = userRole === "FLEET_MANAGER";
  router.push(isManager ? "/fleet" : "/dashboard");
}

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean().optional(),
});

export function LoginForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    const res = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    if (res?.error) {
      toast.error("Sign in failed", { description: "Invalid email or password." });
      return;
    }
    toast.success("Welcome back", { description: "Signed in to LogPilot." });
    routeByRole(router);
  };

  const fill = (email: string) => {
    setValue("email", email);
    setValue("password", "logpilot");
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Welcome back. Enter your credentials to access your logs.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
        <Field label="Email" error={errors.email?.message}>
          <Input placeholder="you@carrier.com" autoComplete="email" {...register("email")} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <PasswordInput placeholder="••••••••" autoComplete="current-password" {...register("password")} />
        </Field>
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary" {...register("remember")} />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" variant="premium" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
        </Button>
      </form>

      <div className="mt-6 space-y-2">
        <p className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Demo accounts — password: logpilot
        </p>
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => fill("driver@ridgeline.co")}
            className="flex items-center gap-2.5 rounded-lg border border-border/80 px-3 py-2 text-left text-sm transition-colors hover:border-primary/40 hover:bg-secondary/50"
          >
            <Truck className="h-4 w-4 text-primary" />
            <span className="flex-1">
              <span className="font-medium">Driver</span>
              <span className="block text-xs text-muted-foreground">driver@ridgeline.co</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => fill("manager@ridgeline.co")}
            className="flex items-center gap-2.5 rounded-lg border border-border/80 px-3 py-2 text-left text-sm transition-colors hover:border-primary/40 hover:bg-secondary/50"
          >
            <ShieldCheck className="h-4 w-4 text-duty-sleeper" />
            <span className="flex-1">
              <span className="font-medium">Fleet Manager</span>
              <span className="block text-xs text-muted-foreground">manager@ridgeline.co</span>
            </span>
          </button>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New driver?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

const registerSchema = z
  .object({
    name: z.string().min(2, "Enter your full name"),
    email: z.string().email("Enter a valid email address"),
    licenseNumber: z.string().optional(),
    licenseState: z.string().optional(),
    password: z.string().min(6, "At least 6 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export function RegisterForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: z.infer<typeof registerSchema>) => {
    const result = await registerDriverAction({
      name: data.name,
      email: data.email,
      password: data.password,
      licenseNumber: data.licenseNumber,
      licenseState: data.licenseState,
    });
    if (!result.ok) {
      toast.error("Could not create account", { description: result.error });
      return;
    }
    await signIn("credentials", { email: data.email, password: data.password, redirect: false });
    toast.success("Account created", { description: "Welcome to LogPilot." });
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Create your driver account</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Start keeping a compliant, beautiful daily log.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
        <Field label="Full name" error={errors.name?.message}>
          <Input placeholder="Marcus Bennett" autoComplete="name" {...register("name")} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input placeholder="you@carrier.com" autoComplete="email" {...register("email")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="License #" error={errors.licenseNumber?.message}>
            <Input placeholder="OH-000000" {...register("licenseNumber")} />
          </Field>
          <Field label="State" error={errors.licenseState?.message}>
            <Input placeholder="OH" {...register("licenseState")} />
          </Field>
        </div>
        <Field label="Password" error={errors.password?.message}>
          <PasswordInput placeholder="Create a password" autoComplete="new-password" {...register("password")} />
        </Field>
        <Field label="Confirm password" error={errors.confirm?.message}>
          <PasswordInput placeholder="Repeat your password" autoComplete="new-password" {...register("confirm")} />
        </Field>
        <Button type="submit" variant="premium" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

const emailSchema = z.object({ email: z.string().email("Enter a valid email address") });

export function ForgotPasswordForm() {
  const [sent, setSent] = React.useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof emailSchema>>({ resolver: zodResolver(emailSchema) });

  const onSubmit = async () => {
    await new Promise((r) => setTimeout(r, 600));
    setSent(true);
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-success/12 text-success">
          <Mail className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a password reset link to{" "}
          <span className="font-medium text-foreground">{getValues("email")}</span>.
        </p>
        <Button variant="outline" className="mt-6 w-full" asChild>
          <Link href="/reset-password">
            <CheckCircle2 className="h-4 w-4" /> Open reset link
          </Link>
        </Button>
        <Link href="/login" className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Enter your email and we&apos;ll send you a reset link.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
        <Field label="Email" error={errors.email?.message}>
          <Input placeholder="you@carrier.com" autoComplete="email" {...register("email")} />
        </Field>
        <Button type="submit" variant="premium" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
        </Button>
      </form>
      <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
    </div>
  );
}

const resetSchema = z
  .object({
    password: z.string().min(6, "At least 6 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export function ResetPasswordForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema) });

  const onSubmit = async () => {
    await new Promise((r) => setTimeout(r, 600));
    toast.success("Password updated", { description: "Sign in with your new password." });
    router.push("/login");
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Choose a strong password you don&apos;t use elsewhere.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
        <Field label="New password" error={errors.password?.message}>
          <PasswordInput placeholder="New password" autoComplete="new-password" {...register("password")} />
        </Field>
        <Field label="Confirm password" error={errors.confirm?.message}>
          <PasswordInput placeholder="Repeat password" autoComplete="new-password" {...register("confirm")} />
        </Field>
        <Button type="submit" variant="premium" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
        </Button>
      </form>
    </div>
  );
}
