"use client";

import { useState, useTransition } from "react";
import { Check, Clock, Home, Mail, Phone, Users, ListTodo } from "lucide-react";
import { updateFamilyTaskStatus } from "@/app/admin/family/actions";

type FamilyMember = {
  id: number;
  role: string;
  name: string;
  email: string | null;
  phone: string | null;
};

type FamilyTask = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  dueDate: string;
  isOverdue: boolean;
  subtasks: Array<{ id: string; title: string; isCompleted: boolean }>;
};

type FamilyClientProps = {
  family: {
    name: string;
    parentName: string | null;
  } | null;
  members: FamilyMember[];
  tasks: FamilyTask[];
  taskStats: {
    completed: number;
    pending: number;
    inProgress: number;
  };
};

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function memberColor(role: string) {
  const normalized = role.toLowerCase();
  if (normalized === "parent") return "bg-purple-500";
  if (normalized === "child") return "bg-green-500";
  return "bg-blue-500";
}

function statusClass(status: string) {
  if (status === "completed") return "bg-green-100 text-green-700";
  if (status === "in-progress") return "bg-blue-100 text-blue-700";
  return "bg-yellow-100 text-yellow-700";
}

function statusLabel(status: string) {
  if (status === "completed") return "Completed";
  if (status === "in-progress") return "In Progress";
  return "Pending";
}

export function FamilyClient({ family, members, tasks, taskStats }: FamilyClientProps) {
  const [mobilePanel, setMobilePanel] = useState<"members" | "tasks">("members");
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!family) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-gray-100">
            <Home className="size-7 text-gray-400" aria-hidden="true" />
          </div>
          <h2 className="mb-1 text-lg font-semibold text-gray-800">No Family Assigned</h2>
          <p className="text-sm text-gray-500">You are not yet assigned to any family.</p>
        </div>
      </div>
    );
  }

  const filteredTasks = tasks.filter((task) => filter === "all" || task.status === filter);

  function updateStatus(taskId: number, status: string) {
    startTransition(async () => {
      const result = await updateFamilyTaskStatus(taskId, status);
      setMessage(result.message);
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mb-4 rounded-xl border border-gray-100 bg-white shadow-sm sm:mb-6">
        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600">
              <Home className="size-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800 sm:text-xl">{family.name}</h1>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3" aria-hidden="true" />
                  {members.length} members
                </span>
                {family.parentName ? (
                  <>
                    <span>-</span>
                    <span>{family.parentName}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {message ? (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      ) : null}

      <div className="mb-4 sm:hidden">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          <button
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              mobilePanel === "members" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600"
            }`}
            type="button"
            onClick={() => setMobilePanel("members")}
          >
            Members ({members.length})
          </button>
          <button
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              mobilePanel === "tasks" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600"
            }`}
            type="button"
            onClick={() => setMobilePanel("tasks")}
          >
            Tasks ({tasks.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[minmax(280px,0.75fr)_minmax(0,1.75fr)]">
        <section className={`${mobilePanel === "tasks" ? "hidden sm:block" : ""} overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm`}>
          <div className="border-b border-gray-100 bg-gray-50/50 px-4 py-3">
            <h2 className="text-base font-semibold text-gray-800">
              <Users className="mr-2 inline size-4 text-blue-500" aria-hidden="true" />
              Family Members <span className="ml-1 text-sm font-normal text-gray-500">({members.length})</span>
            </h2>
          </div>
          <div className="max-h-[500px] divide-y divide-gray-100 overflow-y-auto">
            {members.length > 0 ? (
              members.map((member) => (
                <div key={member.id} className="p-3 transition hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${memberColor(member.role)}`}>
                      {initials(member.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{member.name}</span>
                        {member.role.toLowerCase() === "parent" ? (
                          <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-600">Parent</span>
                        ) : null}
                        {member.role.toLowerCase() === "child" ? (
                          <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-600">Child</span>
                        ) : null}
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {member.phone ? (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Phone className="size-3 text-gray-400" aria-hidden="true" />
                            <span>{member.phone}</span>
                          </div>
                        ) : null}
                        {member.email ? (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Mail className="size-3 text-gray-400" aria-hidden="true" />
                            <span className="truncate">{member.email}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-gray-400">No members found</div>
            )}
          </div>
        </section>

        <section className={`${mobilePanel === "members" ? "hidden sm:block" : ""} min-w-0 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm`}>
          <div className="border-b border-gray-100 bg-gray-50/50 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold text-gray-800">
                  <ListTodo className="mr-2 inline size-4 text-green-500" aria-hidden="true" />
                  Tasks
                </h2>
                <div className="flex gap-1.5">
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-600">
                    {taskStats.completed}
                  </span>
                  <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-600">
                    {taskStats.pending + taskStats.inProgress}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-100 bg-white px-4 pb-1 pt-2">
            <div className="flex gap-1.5 overflow-x-auto">
              {["all", "pending", "in-progress", "completed"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs ${
                    filter === item ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {item === "all" ? "All" : statusLabel(item)}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[500px] overflow-auto">
            <table className="min-w-[760px] w-full text-left">
              <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
                <tr className="text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2 font-semibold">Task</th>
                  <th className="px-3 py-2 font-semibold">Subtasks</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Due date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map((task) => (
                    <tr key={task.id} className={`transition hover:bg-gray-50 ${task.status === "completed" ? "bg-green-50/40" : ""}`}>
                      <td className="px-3 py-3">
                        <span className={`text-sm font-medium ${task.status === "completed" ? "text-gray-500" : "text-gray-800"}`} title={task.description || ""}>
                          {task.title}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600">
                        {task.subtasks.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {task.subtasks.map((subtask) => (
                              <span key={subtask.id} className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 ${subtask.isCompleted ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-gray-50 text-gray-700"}`}>
                                {subtask.isCompleted ? <Check className="size-3 text-green-500" aria-hidden="true" /> : <Clock className="size-3 text-gray-400" aria-hidden="true" />}
                                {subtask.title}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${statusClass(task.status)}`}>
                          {statusLabel(task.status)}
                        </span>
                      </td>
                      <td className={`whitespace-nowrap px-3 py-3 text-xs ${task.isOverdue ? "font-medium text-red-600" : "text-gray-500"}`}>
                        {task.dueDate}
                        {task.isOverdue ? <span className="ml-1">(Overdue)</span> : null}
                      </td>
                      
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-sm text-gray-400">No tasks assigned</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
