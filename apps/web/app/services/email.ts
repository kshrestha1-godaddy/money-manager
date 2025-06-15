import nodemailer from "nodemailer";

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(options: EmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: '"MyMoneyManager" <' + process.env.GMAIL_USER + '>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log("Message sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error while sending mail", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function sendWelcomeEmail(email: string, name?: string) {
  const firstName = name?.split(' ')[0] || 'there';
  
  const subject = "Welcome to MoneyManager - Your Financial Journey Starts Here! 🎉";
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
      <div style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: bold;">
            Welcome to MoneyManager! 🎉
          </h1>
          <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 16px;">
            Your financial journey starts here
          </p>
        </div>

        <!-- Main Content -->
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px;">
            Hi ${firstName}! 👋
          </h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Thank you for subscribing to our newsletter! You've taken the first step towards better financial management.
          </p>

          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Here's what you can expect from us:
          </p>

          <!-- Features List -->
          <div style="background-color: #f3f4f6; border-radius: 12px; padding: 24px; margin-bottom: 25px;">
            <div style="margin-bottom: 15px;">
              <span style="color: #10b981; font-size: 18px; margin-right: 8px;">💰</span>
              <strong style="color: #1f2937;">Monthly Money Tips</strong>
              <p style="color: #6b7280; margin: 5px 0 0 26px; font-size: 14px;">
                Practical advice to help you save more and spend smarter
              </p>
            </div>
            
            <div style="margin-bottom: 15px;">
              <span style="color: #3b82f6; font-size: 18px; margin-right: 8px;">📊</span>
              <strong style="color: #1f2937;">Financial Insights</strong>
              <p style="color: #6b7280; margin: 5px 0 0 26px; font-size: 14px;">
                Market trends and investment opportunities
              </p>
            </div>
            
            <div style="margin-bottom: 15px;">
              <span style="color: #8b5cf6; font-size: 18px; margin-right: 8px;">🚀</span>
              <strong style="color: #1f2937;">Product Updates</strong>
              <p style="color: #6b7280; margin: 5px 0 0 26px; font-size: 14px;">
                New features and improvements to help you manage your finances
              </p>
            </div>
            
            <div>
              <span style="color: #f59e0b; font-size: 18px; margin-right: 8px;">📈</span>
              <strong style="color: #1f2937;">Weekly Digest</strong>
              <p style="color: #6b7280; margin: 5px 0 0 26px; font-size: 14px;">
                Curated financial news and tips delivered weekly
              </p>
            </div>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://mymoneylog.vercel.app/signin" 
               style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; transition: background-color 0.2s;">
              Get Started with MoneyManager
            </a>
          </div>

          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Ready to take control of your finances? Start by tracking your income and expenses, 
            then explore our powerful analytics to understand your spending patterns better.
          </p>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
          <p style="color: #9ca3af; font-size: 14px; margin-bottom: 10px;">
            This email was sent to ${email} because you subscribed to MoneyManager updates.
          </p>
          <p style="color: #9ca3af; font-size: 14px; margin: 0;">
            You can update your preferences or unsubscribe at any time.
          </p>
        </div>
      </div>
    </div>
  `;

  const text = `
    Welcome to MoneyManager, ${firstName}!

    Thank you for subscribing to our newsletter! You've taken the first step towards better financial management.

    Here's what you can expect from us:
    
    💰 Monthly Money Tips - Practical advice to help you save more and spend smarter
    📊 Financial Insights - Market trends and investment opportunities  
    🚀 Product Updates - New features and improvements to help you manage your finances
    📈 Weekly Digest - Curated financial news and tips delivered weekly

    Ready to get started? Visit https://mymoneylog.vercel.app/signin to begin your financial journey.

    This email was sent to ${email} because you subscribed to MoneyManager updates.
    You can update your preferences or unsubscribe at any time.
  `;

  return await sendEmail({
    to: email,
    subject,
    text,
    html
  });
}

export async function sendAccessRequestConfirmation(email: string, message?: string) {
  const subject = "Access Request Received - MoneyManager";
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
      <div style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: bold;">
            Access Request Received ✅
          </h1>
          <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 16px;">
            Thank you for your interest in MoneyManager
          </p>
        </div>

        <!-- Main Content -->
        <div style="margin-bottom: 30px;">
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Hi there! 👋
          </p>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            We've received your access request for <strong>${email}</strong> and will review it shortly.
          </p>

          ${message ? `
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h3 style="color: #1f2937; margin: 0 0 8px 0; font-size: 16px;">Your Message:</h3>
            <p style="color: #4b5563; margin: 0; font-style: italic;">"${message}"</p>
          </div>
          ` : ''}

          <!-- What happens next -->
          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 25px;">
            <h3 style="color: #1e40af; margin: 0 0 12px 0; font-size: 18px;">
              What happens next?
            </h3>
            <ul style="color: #1e40af; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
              <li style="margin-bottom: 8px;">Our team will review your request</li>
              <li style="margin-bottom: 8px;">If approved, you'll receive access within 24-48 hours</li>
              <li>You'll get an email notification once access is granted</li>
            </ul>
          </div>

          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Thank you for your patience! We're excited to help you take control of your finances.
          </p>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
          <p style="color: #9ca3af; font-size: 14px; margin-bottom: 10px;">
            This email was sent to ${email} regarding your MoneyManager access request.
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            If you didn't request access, please ignore this email.
          </p>
        </div>
      </div>
    </div>
  `;

  const text = `
    Access Request Received

    Hi there!

    We've received your access request for ${email} and will review it shortly.

    ${message ? `Your Message: "${message}"` : ''}

    What happens next?
    • Our team will review your request
    • If approved, you'll receive access within 24-48 hours  
    • You'll get an email notification once access is granted

    Thank you for your patience! We're excited to help you take control of your finances.

    This email was sent to ${email} regarding your MoneyManager access request.
    If you didn't request access, please ignore this email.
  `;

  return await sendEmail({
    to: email,
    subject,
    text,
    html
  });
}

export async function sendAccessApprovalEmail(email: string) {
  const subject = "🎉 Access Approved - Welcome to MoneyManager!";
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
      <div style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #10b981; margin: 0; font-size: 32px; font-weight: bold;">
            🎉 Access Approved! 🎉
          </h1>
          <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 18px;">
            Welcome to MoneyManager
          </p>
        </div>

        <!-- Main Content -->
        <div style="margin-bottom: 30px;">
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Great news! 🎊
          </p>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Your access request for <strong>${email}</strong> has been <span style="color: #10b981; font-weight: bold;">approved</span>! 
            You can now sign in and start managing your finances with MoneyManager.
          </p>

          <!-- Success Banner -->
          <div style="background-color: #ecfdf5; border: 2px solid #10b981; border-radius: 12px; padding: 20px; margin-bottom: 25px; text-align: center;">
            <div style="color: #10b981; font-size: 48px; margin-bottom: 8px;">✅</div>
            <h3 style="color: #059669; margin: 0 0 8px 0; font-size: 20px; font-weight: bold;">
              You're All Set!
            </h3>
            <p style="color: #047857; margin: 0; font-size: 16px;">
              Your MoneyManager account is ready to use
            </p>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://mymoneylog.vercel.app/signin" 
               style="background-color: #10b981; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 18px; display: inline-block; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transition: all 0.2s;">
              🚀 Sign In Now
            </a>
          </div>

          <!-- What you can do now -->
          <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 25px;">
            <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 18px; font-weight: bold;">
              What you can do now:
            </h3>
            <ul style="color: #4b5563; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
              <li style="margin-bottom: 8px;">📊 Track your income and expenses</li>
              <li style="margin-bottom: 8px;">📈 View detailed financial analytics</li>
              <li style="margin-bottom: 8px;">🎯 Set and monitor financial goals</li>
              <li style="margin-bottom: 8px;">📱 Access from any device</li>
              <li>💡 Get personalized financial insights</li>
            </ul>
          </div>

          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            We're excited to help you take control of your financial future. 
            If you have any questions or need help getting started, don't hesitate to reach out!
          </p>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
          <p style="color: #9ca3af; font-size: 14px; margin-bottom: 10px;">
            This email was sent to ${email} because your MoneyManager access has been approved.
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Start your financial journey today at <a href="https://mymoneylog.vercel.app" style="color: #10b981;">mymoneylog.vercel.app</a>
          </p>
        </div>
      </div>
    </div>
  `;

  const text = `
    🎉 Access Approved - Welcome to MoneyManager!

    Great news!

    Your access request for ${email} has been APPROVED! You can now sign in and start managing your finances with MoneyManager.

    ✅ You're All Set!
    Your MoneyManager account is ready to use.

    Sign in now: https://mymoneylog.vercel.app/signin

    What you can do now:
    📊 Track your income and expenses
    📈 View detailed financial analytics  
    🎯 Set and monitor financial goals
    📱 Access from any device
    💡 Get personalized financial insights

    We're excited to help you take control of your financial future. 
    If you have any questions or need help getting started, don't hesitate to reach out!

    This email was sent to ${email} because your MoneyManager access has been approved.
    Start your financial journey today at mymoneylog.vercel.app
  `;

  return await sendEmail({
    to: email,
    subject,
    text,
    html
  });
} 