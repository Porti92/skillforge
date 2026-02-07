"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import NoiseBackground from "@/components/ui/noise-background";
import { Settings, ArrowRight, Eye, EyeOff } from "lucide-react";

export interface ConfigField {
  id: string;
  label: string;
  placeholder: string;
  type: "text" | "url" | "password" | "number" | "email";
  required: boolean;
  description?: string;
}

interface ConfigurationFormProps {
  fields: ConfigField[];
  onComplete: (values: Record<string, string>) => void;
  onSkip?: () => void;
}

export function ConfigurationForm({ fields, onComplete, onSkip }: ConfigurationFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (id: string, value: string) => {
    setValues(prev => ({ ...prev, [id]: value }));
    // Clear error when user types
    if (errors[id]) {
      setErrors(prev => ({ ...prev, [id]: "" }));
    }
  };

  const togglePassword = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    fields.forEach(field => {
      const value = values[field.id]?.trim() || "";
      
      if (field.required && !value) {
        newErrors[field.id] = "This field is required";
      } else if (value) {
        if (field.type === "url" && !value.match(/^https?:\/\/.+/)) {
          newErrors[field.id] = "Please enter a valid URL (starting with http:// or https://)";
        } else if (field.type === "email" && !value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          newErrors[field.id] = "Please enter a valid email address";
        } else if (field.type === "number" && isNaN(Number(value))) {
          newErrors[field.id] = "Please enter a valid number";
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onComplete(values);
    }
  };

  const requiredFields = fields.filter(f => f.required);
  const optionalFields = fields.filter(f => !f.required);
  const allOptional = requiredFields.length === 0;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 sm:px-6 py-8 relative overflow-x-hidden">
      <NoiseBackground />
      <motion.div 
        className="w-full max-w-xl relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 mb-4">
            <Settings className="w-6 h-6 text-amber-500" />
          </div>
          <h2 className="font-serif text-2xl font-medium text-zinc-100">
            Configure your skill
          </h2>
          <p className="mt-2 text-base text-zinc-500">
            {allOptional 
              ? "Optional settings to customize your skill"
              : "Enter the specific values your skill needs"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Required fields */}
          {requiredFields.length > 0 && (
            <div className="space-y-4">
              {requiredFields.map((field, index) => (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <FieldInput
                    field={field}
                    value={values[field.id] || ""}
                    onChange={(v) => handleChange(field.id, v)}
                    error={errors[field.id]}
                    showPassword={showPasswords[field.id]}
                    onTogglePassword={() => togglePassword(field.id)}
                  />
                </motion.div>
              ))}
            </div>
          )}

          {/* Optional fields */}
          {optionalFields.length > 0 && (
            <div className="space-y-4">
              {requiredFields.length > 0 && (
                <p className="text-xs text-zinc-500 pt-2">Optional</p>
              )}
              {optionalFields.map((field, index) => (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: (requiredFields.length + index) * 0.05 }}
                >
                  <FieldInput
                    field={field}
                    value={values[field.id] || ""}
                    onChange={(v) => handleChange(field.id, v)}
                    error={errors[field.id]}
                    showPassword={showPasswords[field.id]}
                    onTogglePassword={() => togglePassword(field.id)}
                  />
                </motion.div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {allOptional && onSkip && (
              <Button
                type="button"
                onClick={onSkip}
                variant="outline"
                className="flex-1 border-zinc-700 hover:bg-zinc-800 text-zinc-300"
              >
                Skip
              </Button>
            )}
            <Button
              type="submit"
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-black"
            >
              Generate Skill
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </form>

        {/* Help text */}
        <p className="mt-6 text-center text-xs text-zinc-600">
          These values will be embedded in your skill. You can always edit them later.
        </p>
      </motion.div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  error,
  showPassword,
  onTogglePassword,
}: {
  field: ConfigField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  showPassword?: boolean;
  onTogglePassword?: () => void;
}) {
  const inputType = field.type === "password" && showPassword ? "text" : field.type;

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-200">
        {field.label}
        {field.required && <span className="text-amber-500 ml-1">*</span>}
      </label>
      {field.description && (
        <p className="text-xs text-zinc-500">{field.description}</p>
      )}
      <div className="relative">
        <Input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={`h-11 bg-zinc-800/50 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 focus:border-amber-600 focus:ring-amber-600/20 ${
            field.type === "password" ? "pr-10" : ""
          } ${error ? "border-red-500" : ""}`}
        />
        {field.type === "password" && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
