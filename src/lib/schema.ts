import { z } from 'zod'

export const subjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  order: z.number(),
})

export const chapterSchema = z.object({
  id: z.string().min(1),
  subjectId: z.string().min(1),
  name: z.string().min(1),
  order: z.number(),
})

export const questionSchema = z.object({
  id: z.string().min(1),
  chapterId: z.string().min(1),
  tag: z.string().optional(),
  stem: z.string().min(1),
  options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  answerIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
})

export const indexDataSchema = z.object({
  subjects: z.array(subjectSchema),
  chapters: z.array(chapterSchema),
})

export const questionArraySchema = z.array(questionSchema)

export type Subject = z.infer<typeof subjectSchema>
export type Chapter = z.infer<typeof chapterSchema>
export type Question = z.infer<typeof questionSchema>
export type IndexData = z.infer<typeof indexDataSchema>
