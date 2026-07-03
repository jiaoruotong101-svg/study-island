"use client";

import { MistakeSection } from "@/components/mistakes/mistake-section";
import { ChatSection } from "@/components/chat/chat-section";
import { TaskSection } from "@/components/tasks/task-section";
import { MoodSection } from "@/components/mood/mood-section";
import { NoteSection } from "@/components/notes/note-section";
import { StatsSection } from "@/components/stats/stats-section";
import { AdminSection } from "@/components/admin/admin-section";
import { HomeSection } from "@/components/home/home-section";
import { useNavStore } from "@/store/nav-store";

export default function HomePage() {
  const activeTab = useNavStore((s) => s.activeTab);

  if (activeTab === "tasks") {
    return <TaskSection />;
  }
  if (activeTab === "mistakes") {
    return <MistakeSection />;
  }
  if (activeTab === "chat") {
    return <ChatSection />;
  }
  if (activeTab === "mood") {
    return <MoodSection />;
  }
  if (activeTab === "notes") {
    return <NoteSection />;
  }
  if (activeTab === "stats") {
    return <StatsSection />;
  }
  if (activeTab === "admin") {
    return <AdminSection />;
  }
  return <HomeSection />;
}
