"use client";

import { MistakeSection } from "@/components/mistakes/mistake-section";
import { ChatSection } from "@/components/chat/chat-section";
import { TaskSection } from "@/components/tasks/task-section";
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
  return <HomeSection />;
}
