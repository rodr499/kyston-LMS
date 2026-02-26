"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableRow } from "./SortableRow";
import ClassLinkCell from "./ClassLinkCell";
import DeleteClassButton from "./DeleteClassButton";

type ClassItem = {
  id: string;
  name: string;
  isPublished: boolean;
  allowSelfEnrollment: boolean;
  noEnrollmentNeeded: boolean;
  meetingUrl: string | null;
  meetingPlatform: string;
  sortOrder: number;
};

export default function ClassesListClient({
  initialClasses,
  programId,
  courseId,
  churchId,
  baseUrl,
}: {
  initialClasses: ClassItem[];
  programId: string;
  courseId: string;
  churchId: string;
  baseUrl: string;
}) {
  const [classList, setClassList] = useState(initialClasses);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = classList.findIndex((c) => c.id === active.id);
    const newIndex = classList.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(classList, oldIndex, newIndex);
    setClassList(reordered);

    await fetch("/api/admin/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "classes", items: reordered.map((c) => ({ id: c.id })) }),
    });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="table-responsive-card overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr className="bg-base-200 text-base-content/60 text-xs uppercase tracking-widest font-body">
              <th className="w-8" />
              <th>Name</th>
              <th>Self-enroll</th>
              <th>No enrollment</th>
              <th>Status</th>
              <th>Class link</th>
              <th>Meeting link</th>
              <th>Actions</th>
            </tr>
          </thead>
          <SortableContext items={classList.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <tbody>
              {classList.map((c) => (
                <SortableRow key={c.id} id={c.id}>
                  <td data-label="Name" className="font-body font-medium">{c.name}</td>
                  <td data-label="Self-enroll" className="font-body">{c.allowSelfEnrollment ? "Yes" : "No"}</td>
                  <td data-label="No enrollment" className="font-body">{c.noEnrollmentNeeded ? "Yes" : "No"}</td>
                  <td data-label="Status">
                    {c.isPublished ? (
                      <span className="badge badge-success gap-1 font-body text-xs">Published</span>
                    ) : (
                      <span className="badge badge-ghost font-body text-xs">Draft</span>
                    )}
                  </td>
                  <td data-label="Class link">
                    <ClassLinkCell classId={c.id} baseUrl={baseUrl} />
                  </td>
                  <td data-label="Meeting link">
                    <ClassLinkCell meetingUrl={c.meetingUrl} meetingPlatform={c.meetingPlatform} />
                  </td>
                  <td data-label="Actions">
                    <span className="flex items-center gap-2">
                      <Link href={`/admin/programs/${programId}/courses/${courseId}/classes/${c.id}`} className="btn btn-ghost btn-xs rounded-lg font-body">Edit</Link>
                      <DeleteClassButton classId={c.id} churchId={churchId} programId={programId} courseId={courseId} />
                    </span>
                  </td>
                </SortableRow>
              ))}
            </tbody>
          </SortableContext>
        </table>
      </div>
    </DndContext>
  );
}
