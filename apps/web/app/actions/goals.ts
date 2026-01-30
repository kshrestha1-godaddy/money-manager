"use server";

import prisma from "@repo/db/client";
import { getAuthenticatedSession, getUserIdFromSession } from "../utils/auth";

// Types for Goal operations
interface GoalFormData {
  title: string;
  description?: string;
  targetAmount?: number;
  currency?: string;
  startDate: Date;
  targetCompletionDate?: Date;
  priority?: number;
  status?: string;
  category?: string;
  tags?: string[];
  color?: string;
  notes?: string;
  successCriteria?: string;
  accountId?: number;
  riskLevel?: string;
  isPublic?: boolean;
}

interface GoalPhaseFormData {
  name: string;
  description?: string;
  plannedStartDate: Date;
  plannedEndDate: Date;
  sequenceOrder: number;
  estimatedDuration?: number;
  notes?: string;
  requirements?: string;
  deliverables?: string;
}

interface GoalProgressFormData {
  progressPercentage: number;
  amountProgress?: number;
  milestoneReached?: string;
  notes?: string;
  challenges?: string;
  nextSteps?: string;
  progressDate?: Date;
  phaseId?: number;
}

interface FormattedGoal {
  id: number;
  title: string;
  description?: string;
  targetAmount?: number;
  currentAmount: number;
  currency: string;
  startDate: Date;
  targetCompletionDate?: Date;
  actualCompletionDate?: Date;
  priority: number;
  status: string;
  category?: string;
  tags: string[];
  color: string;
  notes?: string;
  successCriteria?: string;
  accountId?: number;
  riskLevel: string;
  isPublic: boolean;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
  phases?: FormattedGoalPhase[];
  progress?: FormattedGoalProgress[];
}

interface FormattedGoalPhase {
  id: number;
  name: string;
  description?: string;
  plannedStartDate: Date;
  plannedEndDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  status: string;
  progressPercentage: number;
  sequenceOrder: number;
  estimatedDuration?: number;
  actualDuration?: number;
  notes?: string;
  requirements?: string;
  deliverables?: string;
  goalId: number;
  createdAt: Date;
  updatedAt: Date;
}

interface FormattedGoalProgress {
  id: number;
  progressPercentage: number;
  amountProgress?: number;
  milestoneReached?: string;
  notes?: string;
  challenges?: string;
  nextSteps?: string;
  progressDate: Date;
  isAutomaticUpdate: boolean;
  phaseId?: number;
  goalId: number;
  createdAt: Date;
  updatedAt: Date;
}

// GOAL CRUD OPERATIONS

export async function getGoals(filters?: {
  status?: string;
  category?: string;
  priority?: number;
  limit?: number;
}): Promise<{ data?: FormattedGoal[], error?: string }> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    const whereClause: any = {
      userId: userId,
    };

    if (filters?.status) {
      whereClause.status = filters.status;
    }
    if (filters?.category) {
      whereClause.category = filters.category;
    }
    if (filters?.priority) {
      whereClause.priority = filters.priority;
    }

    const goals = await prisma.goal.findMany({
      where: whereClause,
      include: {
        phases: {
          orderBy: { sequenceOrder: 'asc' }
        },
        progress: {
          orderBy: { progressDate: 'desc' },
          take: 5 // Get latest 5 progress entries
        }
      },
      orderBy: [
        { priority: 'asc' },
        { startDate: 'asc' }
      ],
      take: filters?.limit || undefined,
    });

    const formattedGoals: FormattedGoal[] = goals.map(goal => ({
      id: goal.id,
      title: goal.title,
      description: goal.description,
      targetAmount: goal.targetAmount ? parseFloat(goal.targetAmount.toString()) : undefined,
      currentAmount: parseFloat(goal.currentAmount.toString()),
      currency: goal.currency,
      startDate: goal.startDate,
      targetCompletionDate: goal.targetCompletionDate,
      actualCompletionDate: goal.actualCompletionDate,
      priority: goal.priority,
      status: goal.status,
      category: goal.category,
      tags: goal.tags,
      color: goal.color,
      notes: goal.notes,
      successCriteria: goal.successCriteria,
      accountId: goal.accountId,
      riskLevel: goal.riskLevel,
      isPublic: goal.isPublic,
      userId: goal.userId,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
      phases: goal.phases.map(phase => ({
        id: phase.id,
        name: phase.name,
        description: phase.description,
        plannedStartDate: phase.plannedStartDate,
        plannedEndDate: phase.plannedEndDate,
        actualStartDate: phase.actualStartDate,
        actualEndDate: phase.actualEndDate,
        status: phase.status,
        progressPercentage: phase.progressPercentage,
        sequenceOrder: phase.sequenceOrder,
        estimatedDuration: phase.estimatedDuration,
        actualDuration: phase.actualDuration,
        notes: phase.notes,
        requirements: phase.requirements,
        deliverables: phase.deliverables,
        goalId: phase.goalId,
        createdAt: phase.createdAt,
        updatedAt: phase.updatedAt,
      })),
      progress: goal.progress.map(progress => ({
        id: progress.id,
        progressPercentage: progress.progressPercentage,
        amountProgress: progress.amountProgress ? parseFloat(progress.amountProgress.toString()) : undefined,
        milestoneReached: progress.milestoneReached,
        notes: progress.notes,
        challenges: progress.challenges,
        nextSteps: progress.nextSteps,
        progressDate: progress.progressDate,
        isAutomaticUpdate: progress.isAutomaticUpdate,
        phaseId: progress.phaseId,
        goalId: progress.goalId,
        createdAt: progress.createdAt,
        updatedAt: progress.updatedAt,
      }))
    }));

    return { data: formattedGoals };
  } catch (error) {
    console.error("Error fetching goals:", error);
    return { error: "Failed to fetch goals" };
  }
}

export async function getGoal(id: number): Promise<{ data?: FormattedGoal, error?: string }> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    const goal = await prisma.goal.findFirst({
      where: {
        id: id,
        userId: userId,
      },
      include: {
        phases: {
          orderBy: { sequenceOrder: 'asc' }
        },
        progress: {
          orderBy: { progressDate: 'desc' }
        },
        account: {
          select: {
            id: true,
            nickname: true,
            bankName: true,
          }
        }
      },
    });

    if (!goal) {
      return { error: "Goal not found" };
    }

    const formattedGoal: FormattedGoal = {
      id: goal.id,
      title: goal.title,
      description: goal.description,
      targetAmount: goal.targetAmount ? parseFloat(goal.targetAmount.toString()) : undefined,
      currentAmount: parseFloat(goal.currentAmount.toString()),
      currency: goal.currency,
      startDate: goal.startDate,
      targetCompletionDate: goal.targetCompletionDate,
      actualCompletionDate: goal.actualCompletionDate,
      priority: goal.priority,
      status: goal.status,
      category: goal.category,
      tags: goal.tags,
      color: goal.color,
      notes: goal.notes,
      successCriteria: goal.successCriteria,
      accountId: goal.accountId,
      riskLevel: goal.riskLevel,
      isPublic: goal.isPublic,
      userId: goal.userId,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
      phases: goal.phases.map(phase => ({
        id: phase.id,
        name: phase.name,
        description: phase.description,
        plannedStartDate: phase.plannedStartDate,
        plannedEndDate: phase.plannedEndDate,
        actualStartDate: phase.actualStartDate,
        actualEndDate: phase.actualEndDate,
        status: phase.status,
        progressPercentage: phase.progressPercentage,
        sequenceOrder: phase.sequenceOrder,
        estimatedDuration: phase.estimatedDuration,
        actualDuration: phase.actualDuration,
        notes: phase.notes,
        requirements: phase.requirements,
        deliverables: phase.deliverables,
        goalId: phase.goalId,
        createdAt: phase.createdAt,
        updatedAt: phase.updatedAt,
      })),
      progress: goal.progress.map(progress => ({
        id: progress.id,
        progressPercentage: progress.progressPercentage,
        amountProgress: progress.amountProgress ? parseFloat(progress.amountProgress.toString()) : undefined,
        milestoneReached: progress.milestoneReached,
        notes: progress.notes,
        challenges: progress.challenges,
        nextSteps: progress.nextSteps,
        progressDate: progress.progressDate,
        isAutomaticUpdate: progress.isAutomaticUpdate,
        phaseId: progress.phaseId,
        goalId: progress.goalId,
        createdAt: progress.createdAt,
        updatedAt: progress.updatedAt,
      }))
    };

    return { data: formattedGoal };
  } catch (error) {
    console.error("Error fetching goal:", error);
    return { error: "Failed to fetch goal" };
  }
}

export async function createGoal(data: GoalFormData): Promise<{ data?: FormattedGoal, error?: string }> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    // Validate account ownership if accountId provided
    if (data.accountId) {
      const account = await prisma.account.findFirst({
        where: {
          id: data.accountId,
          userId: userId,
        },
      });
      if (!account) {
        return { error: "Account not found or access denied" };
      }
    }

    const goal = await prisma.goal.create({
      data: {
        title: data.title,
        description: data.description,
        targetAmount: data.targetAmount,
        currentAmount: 0,
        currency: data.currency || 'USD',
        startDate: data.startDate,
        targetCompletionDate: data.targetCompletionDate,
        priority: data.priority || 1,
        status: data.status || 'PLANNING',
        category: data.category,
        tags: data.tags || [],
        color: data.color || '#6366f1',
        notes: data.notes,
        successCriteria: data.successCriteria,
        accountId: data.accountId,
        riskLevel: data.riskLevel || 'LOW',
        isPublic: data.isPublic || false,
        userId: userId,
      },
      include: {
        phases: true,
        progress: true,
      },
    });

    const formattedGoal: FormattedGoal = {
      id: goal.id,
      title: goal.title,
      description: goal.description,
      targetAmount: goal.targetAmount ? parseFloat(goal.targetAmount.toString()) : undefined,
      currentAmount: parseFloat(goal.currentAmount.toString()),
      currency: goal.currency,
      startDate: goal.startDate,
      targetCompletionDate: goal.targetCompletionDate,
      actualCompletionDate: goal.actualCompletionDate,
      priority: goal.priority,
      status: goal.status,
      category: goal.category,
      tags: goal.tags,
      color: goal.color,
      notes: goal.notes,
      successCriteria: goal.successCriteria,
      accountId: goal.accountId,
      riskLevel: goal.riskLevel,
      isPublic: goal.isPublic,
      userId: goal.userId,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
      phases: [],
      progress: []
    };

    return { data: formattedGoal };
  } catch (error) {
    console.error("Error creating goal:", error);
    return { error: "Failed to create goal" };
  }
}

export async function updateGoal(id: number, data: Partial<GoalFormData>): Promise<{ data?: FormattedGoal, error?: string }> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    // Verify ownership
    const existingGoal = await prisma.goal.findFirst({
      where: {
        id: id,
        userId: userId,
      },
    });

    if (!existingGoal) {
      return { error: "Goal not found or access denied" };
    }

    // Validate account ownership if accountId provided
    if (data.accountId) {
      const account = await prisma.account.findFirst({
        where: {
          id: data.accountId,
          userId: userId,
        },
      });
      if (!account) {
        return { error: "Account not found or access denied" };
      }
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.targetAmount !== undefined) updateData.targetAmount = data.targetAmount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.targetCompletionDate !== undefined) updateData.targetCompletionDate = data.targetCompletionDate;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.successCriteria !== undefined) updateData.successCriteria = data.successCriteria;
    if (data.accountId !== undefined) updateData.accountId = data.accountId;
    if (data.riskLevel !== undefined) updateData.riskLevel = data.riskLevel;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;

    // Update completion date if status changes to COMPLETED
    if (data.status === 'COMPLETED' && !existingGoal.actualCompletionDate) {
      updateData.actualCompletionDate = new Date();
    }

    const goal = await prisma.goal.update({
      where: { id: id },
      data: updateData,
      include: {
        phases: {
          orderBy: { sequenceOrder: 'asc' }
        },
        progress: {
          orderBy: { progressDate: 'desc' },
          take: 5
        }
      },
    });

    const formattedGoal: FormattedGoal = {
      id: goal.id,
      title: goal.title,
      description: goal.description,
      targetAmount: goal.targetAmount ? parseFloat(goal.targetAmount.toString()) : undefined,
      currentAmount: parseFloat(goal.currentAmount.toString()),
      currency: goal.currency,
      startDate: goal.startDate,
      targetCompletionDate: goal.targetCompletionDate,
      actualCompletionDate: goal.actualCompletionDate,
      priority: goal.priority,
      status: goal.status,
      category: goal.category,
      tags: goal.tags,
      color: goal.color,
      notes: goal.notes,
      successCriteria: goal.successCriteria,
      accountId: goal.accountId,
      riskLevel: goal.riskLevel,
      isPublic: goal.isPublic,
      userId: goal.userId,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
      phases: goal.phases.map(phase => ({
        id: phase.id,
        name: phase.name,
        description: phase.description,
        plannedStartDate: phase.plannedStartDate,
        plannedEndDate: phase.plannedEndDate,
        actualStartDate: phase.actualStartDate,
        actualEndDate: phase.actualEndDate,
        status: phase.status,
        progressPercentage: phase.progressPercentage,
        sequenceOrder: phase.sequenceOrder,
        estimatedDuration: phase.estimatedDuration,
        actualDuration: phase.actualDuration,
        notes: phase.notes,
        requirements: phase.requirements,
        deliverables: phase.deliverables,
        goalId: phase.goalId,
        createdAt: phase.createdAt,
        updatedAt: phase.updatedAt,
      })),
      progress: goal.progress.map(progress => ({
        id: progress.id,
        progressPercentage: progress.progressPercentage,
        amountProgress: progress.amountProgress ? parseFloat(progress.amountProgress.toString()) : undefined,
        milestoneReached: progress.milestoneReached,
        notes: progress.notes,
        challenges: progress.challenges,
        nextSteps: progress.nextSteps,
        progressDate: progress.progressDate,
        isAutomaticUpdate: progress.isAutomaticUpdate,
        phaseId: progress.phaseId,
        goalId: progress.goalId,
        createdAt: progress.createdAt,
        updatedAt: progress.updatedAt,
      }))
    };

    return { data: formattedGoal };
  } catch (error) {
    console.error("Error updating goal:", error);
    return { error: "Failed to update goal" };
  }
}

export async function deleteGoal(id: number): Promise<{ success?: boolean, error?: string }> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    // Verify ownership
    const existingGoal = await prisma.goal.findFirst({
      where: {
        id: id,
        userId: userId,
      },
    });

    if (!existingGoal) {
      return { error: "Goal not found or access denied" };
    }

    // Delete goal (this will cascade delete phases and progress due to onDelete: Cascade)
    await prisma.goal.delete({
      where: { id: id },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting goal:", error);
    return { error: "Failed to delete goal" };
  }
}

// GOAL PHASE OPERATIONS

export async function createGoalPhase(goalId: number, data: GoalPhaseFormData): Promise<{ data?: FormattedGoalPhase, error?: string }> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    // Verify goal ownership
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId: userId,
      },
    });

    if (!goal) {
      return { error: "Goal not found or access denied" };
    }

    const phase = await prisma.goalPhase.create({
      data: {
        name: data.name,
        description: data.description,
        plannedStartDate: data.plannedStartDate,
        plannedEndDate: data.plannedEndDate,
        sequenceOrder: data.sequenceOrder,
        estimatedDuration: data.estimatedDuration,
        notes: data.notes,
        requirements: data.requirements,
        deliverables: data.deliverables,
        goalId: goalId,
        userId: userId,
      },
    });

    const formattedPhase: FormattedGoalPhase = {
      id: phase.id,
      name: phase.name,
      description: phase.description,
      plannedStartDate: phase.plannedStartDate,
      plannedEndDate: phase.plannedEndDate,
      actualStartDate: phase.actualStartDate,
      actualEndDate: phase.actualEndDate,
      status: phase.status,
      progressPercentage: phase.progressPercentage,
      sequenceOrder: phase.sequenceOrder,
      estimatedDuration: phase.estimatedDuration,
      actualDuration: phase.actualDuration,
      notes: phase.notes,
      requirements: phase.requirements,
      deliverables: phase.deliverables,
      goalId: phase.goalId,
      createdAt: phase.createdAt,
      updatedAt: phase.updatedAt,
    };

    return { data: formattedPhase };
  } catch (error) {
    console.error("Error creating goal phase:", error);
    return { error: "Failed to create goal phase" };
  }
}

export async function updateGoalPhase(id: number, data: Partial<GoalPhaseFormData & { status?: string, progressPercentage?: number }>): Promise<{ data?: FormattedGoalPhase, error?: string }> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    // Verify ownership
    const existingPhase = await prisma.goalPhase.findFirst({
      where: {
        id: id,
        userId: userId,
      },
    });

    if (!existingPhase) {
      return { error: "Goal phase not found or access denied" };
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.plannedStartDate !== undefined) updateData.plannedStartDate = data.plannedStartDate;
    if (data.plannedEndDate !== undefined) updateData.plannedEndDate = data.plannedEndDate;
    if (data.sequenceOrder !== undefined) updateData.sequenceOrder = data.sequenceOrder;
    if (data.estimatedDuration !== undefined) updateData.estimatedDuration = data.estimatedDuration;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.requirements !== undefined) updateData.requirements = data.requirements;
    if (data.deliverables !== undefined) updateData.deliverables = data.deliverables;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.progressPercentage !== undefined) updateData.progressPercentage = data.progressPercentage;

    // Auto-set actual dates based on status changes
    if (data.status === 'IN_PROGRESS' && !existingPhase.actualStartDate) {
      updateData.actualStartDate = new Date();
    }
    if (data.status === 'COMPLETED' && !existingPhase.actualEndDate) {
      updateData.actualEndDate = new Date();
      updateData.progressPercentage = 100;
    }

    const phase = await prisma.goalPhase.update({
      where: { id: id },
      data: updateData,
    });

    const formattedPhase: FormattedGoalPhase = {
      id: phase.id,
      name: phase.name,
      description: phase.description,
      plannedStartDate: phase.plannedStartDate,
      plannedEndDate: phase.plannedEndDate,
      actualStartDate: phase.actualStartDate,
      actualEndDate: phase.actualEndDate,
      status: phase.status,
      progressPercentage: phase.progressPercentage,
      sequenceOrder: phase.sequenceOrder,
      estimatedDuration: phase.estimatedDuration,
      actualDuration: phase.actualDuration,
      notes: phase.notes,
      requirements: phase.requirements,
      deliverables: phase.deliverables,
      goalId: phase.goalId,
      createdAt: phase.createdAt,
      updatedAt: phase.updatedAt,
    };

    return { data: formattedPhase };
  } catch (error) {
    console.error("Error updating goal phase:", error);
    return { error: "Failed to update goal phase" };
  }
}

export async function deleteGoalPhase(id: number): Promise<{ success?: boolean, error?: string }> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    // Verify ownership
    const existingPhase = await prisma.goalPhase.findFirst({
      where: {
        id: id,
        userId: userId,
      },
    });

    if (!existingPhase) {
      return { error: "Goal phase not found or access denied" };
    }

    await prisma.goalPhase.delete({
      where: { id: id },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting goal phase:", error);
    return { error: "Failed to delete goal phase" };
  }
}

// GOAL PROGRESS OPERATIONS

export async function createGoalProgress(goalId: number, data: GoalProgressFormData): Promise<{ data?: FormattedGoalProgress, error?: string }> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    // Verify goal ownership
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId: userId,
      },
    });

    if (!goal) {
      return { error: "Goal not found or access denied" };
    }

    // Verify phase ownership if phaseId provided
    if (data.phaseId) {
      const phase = await prisma.goalPhase.findFirst({
        where: {
          id: data.phaseId,
          goalId: goalId,
          userId: userId,
        },
      });
      if (!phase) {
        return { error: "Goal phase not found or access denied" };
      }
    }

    const progress = await prisma.goalProgress.create({
      data: {
        progressPercentage: data.progressPercentage,
        amountProgress: data.amountProgress,
        milestoneReached: data.milestoneReached,
        notes: data.notes,
        challenges: data.challenges,
        nextSteps: data.nextSteps,
        progressDate: data.progressDate || new Date(),
        phaseId: data.phaseId,
        goalId: goalId,
        userId: userId,
      },
    });

    // Update goal's current amount if amountProgress is provided
    if (data.amountProgress !== undefined) {
      await prisma.goal.update({
        where: { id: goalId },
        data: { currentAmount: data.amountProgress },
      });
    }

    const formattedProgress: FormattedGoalProgress = {
      id: progress.id,
      progressPercentage: progress.progressPercentage,
      amountProgress: progress.amountProgress ? parseFloat(progress.amountProgress.toString()) : undefined,
      milestoneReached: progress.milestoneReached,
      notes: progress.notes,
      challenges: progress.challenges,
      nextSteps: progress.nextSteps,
      progressDate: progress.progressDate,
      isAutomaticUpdate: progress.isAutomaticUpdate,
      phaseId: progress.phaseId,
      goalId: progress.goalId,
      createdAt: progress.createdAt,
      updatedAt: progress.updatedAt,
    };

    return { data: formattedProgress };
  } catch (error) {
    console.error("Error creating goal progress:", error);
    return { error: "Failed to create goal progress" };
  }
}

// UTILITY FUNCTIONS

export async function getGoalTimeline(goalId: number): Promise<{ data?: any[], error?: string }> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId: userId,
      },
      include: {
        phases: {
          orderBy: { sequenceOrder: 'asc' }
        },
        progress: {
          orderBy: { progressDate: 'asc' }
        }
      },
    });

    if (!goal) {
      return { error: "Goal not found or access denied" };
    }

    // Build timeline with phases and progress
    const timeline = [
      {
        type: 'goal_start',
        date: goal.startDate,
        title: `Goal Started: ${goal.title}`,
        description: goal.description,
      },
      ...goal.phases.map(phase => [
        {
          type: 'phase_start',
          date: phase.plannedStartDate,
          title: `${phase.name} - Planned Start`,
          description: phase.description,
          phaseId: phase.id,
        },
        {
          type: 'phase_end',
          date: phase.plannedEndDate,
          title: `${phase.name} - Planned End`,
          description: phase.deliverables,
          phaseId: phase.id,
        }
      ]).flat(),
      ...goal.progress.map(progress => ({
        type: 'progress_update',
        date: progress.progressDate,
        title: `Progress Update: ${progress.progressPercentage}%`,
        description: progress.milestoneReached || progress.notes,
        progressId: progress.id,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (goal.targetCompletionDate) {
      timeline.push({
        type: 'goal_target_end',
        date: goal.targetCompletionDate,
        title: `Target Completion: ${goal.title}`,
        description: goal.successCriteria,
      });
    }

    if (goal.actualCompletionDate) {
      timeline.push({
        type: 'goal_completed',
        date: goal.actualCompletionDate,
        title: `Goal Completed: ${goal.title}`,
        description: 'Goal successfully achieved!',
      });
    }

    return { data: timeline };
  } catch (error) {
    console.error("Error fetching goal timeline:", error);
    return { error: "Failed to fetch goal timeline" };
  }
}

export async function getGoalCategories(): Promise<{ data?: string[], error?: string }> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    const categories = await prisma.goal.findMany({
      where: {
        userId: userId,
        category: {
          not: null,
        },
      },
      select: {
        category: true,
      },
      distinct: ['category'],
      orderBy: {
        category: 'asc',
      },
    });

    const categoryList = categories
      .map(item => item.category)
      .filter(Boolean) as string[];

    return { data: categoryList };
  } catch (error) {
    console.error("Error fetching goal categories:", error);
    return { error: "Failed to fetch goal categories" };
  }
}

export async function getGoalStats(): Promise<{ data?: any, error?: string }> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    const [totalGoals, completedGoals, activeGoals, overdueGoals] = await Promise.all([
      prisma.goal.count({
        where: { userId: userId },
      }),
      prisma.goal.count({
        where: { 
          userId: userId,
          status: 'COMPLETED',
        },
      }),
      prisma.goal.count({
        where: { 
          userId: userId,
          status: 'ACTIVE',
        },
      }),
      prisma.goal.count({
        where: { 
          userId: userId,
          status: 'OVERDUE',
        },
      }),
    ]);

    const stats = {
      totalGoals,
      completedGoals,
      activeGoals,
      overdueGoals,
      completionRate: totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0,
    };

    return { data: stats };
  } catch (error) {
    console.error("Error fetching goal stats:", error);
    return { error: "Failed to fetch goal stats" };
  }
}