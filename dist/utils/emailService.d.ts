interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}
declare class EmailService {
    private transporter;
    private fromEmail;
    constructor();
    private createTransporter;
    sendEmail(options: EmailOptions): Promise<void>;
    sendVerificationEmail(email: string, username: string, token: string): Promise<void>;
    sendPasswordResetEmail(email: string, username: string, token: string): Promise<void>;
    sendAccountCreatedEmail(options: {
        to: string;
        username: string;
        firstName: string;
        role: string;
        createdBy: string;
        verificationToken?: string;
        needsApproval?: boolean;
        approvalRequired?: string;
    }): Promise<void>;
    sendApprovalNotificationEmail(options: {
        to: string;
        approverName: string;
        newUserName: string;
        newUserEmail: string;
        newUserRole: string;
        createdByName: string;
        createdByRole: string;
        selfApproval?: boolean;
    }): Promise<void>;
    sendWelcomeEmail(options: {
        to: string;
        username: string;
        firstName: string;
        role: string;
        createdBy: string;
        temporaryPassword?: string;
    }): Promise<void>;
    verifyConnection(): Promise<boolean>;
    private getVerificationEmailTemplate;
    private getPasswordResetEmailTemplate;
    private getAccountCreatedEmailTemplate;
    private getApprovalNotificationEmailTemplate;
    private getWelcomeEmailTemplate;
    private stripHtml;
}
declare const _default: EmailService;
export default _default;
//# sourceMappingURL=emailService.d.ts.map