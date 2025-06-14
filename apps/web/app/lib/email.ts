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