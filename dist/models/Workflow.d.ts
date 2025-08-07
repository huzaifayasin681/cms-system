import mongoose, { Document } from 'mongoose';
export interface IWorkflowStep {
    id: string;
    name: string;
    description?: string;
    requiredRole: 'editor' | 'admin' | 'superadmin';
    assignedUsers?: mongoose.Types.ObjectId[];
    autoApprove: boolean;
    emailNotification: boolean;
    dueInHours?: number;
    order: number;
}
export interface IWorkflow extends Document {
    name: string;
    description?: string;
    contentTypes: ('post' | 'page')[];
    steps: IWorkflowStep[];
    isActive: boolean;
    isDefault: boolean;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export interface IWorkflowInstance extends Document {
    workflowId: mongoose.Types.ObjectId;
    contentId: mongoose.Types.ObjectId;
    contentType: 'post' | 'page';
    currentStepId: string;
    status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled';
    steps: {
        stepId: string;
        status: 'pending' | 'approved' | 'rejected' | 'skipped';
        assignedTo?: mongoose.Types.ObjectId;
        approvedBy?: mongoose.Types.ObjectId;
        rejectedBy?: mongoose.Types.ObjectId;
        comments?: string;
        processedAt?: Date;
        dueAt?: Date;
    }[];
    submittedBy: mongoose.Types.ObjectId;
    submittedAt: Date;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Workflow: mongoose.Model<IWorkflow, {}, {}, {}, mongoose.Document<unknown, {}, IWorkflow, {}> & IWorkflow & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export declare const WorkflowInstance: mongoose.Model<IWorkflowInstance, {}, {}, {}, mongoose.Document<unknown, {}, IWorkflowInstance, {}> & IWorkflowInstance & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Workflow.d.ts.map