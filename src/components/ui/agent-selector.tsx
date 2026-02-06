"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CODING_AGENTS } from "@/lib/coding-agents";
import { cn } from "@/lib/utils";

interface AgentSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function AgentSelector({
  value,
  onValueChange,
  className,
  disabled,
}: AgentSelectorProps) {
  const selectedAgent = CODING_AGENTS.find((agent) => agent.id === value);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SelectTrigger
            className={cn(
              "w-auto gap-2 px-2 border-transparent bg-transparent text-zinc-300 hover:bg-zinc-800/50 hover:text-zinc-100 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none",
              className
            )}
            size="sm"
            onClick={(e) => e.stopPropagation()}
          >
            <SelectValue>
              <div className="flex items-center gap-2">
                {selectedAgent && (
                  <img
                    src={selectedAgent.logo}
                    alt={selectedAgent.name}
                    width={12}
                    height={12}
                    className="shrink-0 size-3"
                  />
                )}
                <span className="text-xs">{selectedAgent?.name || "Select agent"}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
        </TooltipTrigger>
        <TooltipContent sideOffset={8} className="bg-zinc-800 text-zinc-100 border-zinc-700">AI Agent</TooltipContent>
      </Tooltip>
      <SelectContent
        className="border-zinc-700 bg-zinc-900 min-w-0"
        align="start"
      >
        {CODING_AGENTS.map((agent) => (
          <SelectItem
            key={agent.id}
            value={agent.id}
            className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer text-xs py-1"
          >
            <div className="flex items-center gap-2">
              <img
                src={agent.logo}
                alt={agent.name}
                width={12}
                height={12}
                className="shrink-0 size-3"
              />
              <span>{agent.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
