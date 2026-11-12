<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require './PHPMailer/src/Exception.php';
require './PHPMailer/src/PHPMailer.php';
require './PHPMailer/src/SMTP.php';
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $firstName = $_POST["firstName"];
    $lastName = $_POST["lastName"];
    $email = $_POST["email"];
    $phone = $_POST["phone"];
    $message = $_POST["message"];

    $mail = new PHPMailer(true);
    $dEmail = "cmi.groupuganda@gmail.com";
    $smtpHost = getenv('CMI_SMTP_HOST');
    $smtpUsername = getenv('CMI_SMTP_USERNAME');
    $smtpPassword = getenv('CMI_SMTP_PASSWORD');
    $smtpFromEmail = getenv('CMI_SMTP_FROM_EMAIL');

    if (!$smtpHost || !$smtpUsername || !$smtpPassword || !$smtpFromEmail) {
        http_response_code(503);
        echo "Email delivery is not configured.";
        exit;
    }

    try {
        $mail->isSMTP();
        $mail->Host = $smtpHost;
        $mail->SMTPAuth = true;
        $mail->Username = $smtpUsername;
        $mail->Password = $smtpPassword;
        $mail->SMTPSecure = 'ssl';
        $mail->Port = 465;

        $mail->setFrom($smtpFromEmail, 'CMI Contact Notifications');
        $mail->addAddress($dEmail);
        $mail->isHTML(true);
        $mail->Subject = 'New contact message';

        // Capture the content of the email verification template
        ob_start();
        include('emails/contact.php');
        $emailContent = ob_get_clean();

        $emailContent = str_replace('[firstname]', $firstName, $emailContent);
        $emailContent = str_replace('[lastname]', $lastName, $emailContent);
        $emailContent = str_replace('[phone]', $phone, $emailContent);
        $emailContent = str_replace('[email]', $email, $emailContent);
        $emailContent = str_replace('[message]', $message, $emailContent);
       
        $mail->Body = $emailContent;
        if ($mail->send()) {
            header('Location: sucess');
            exit;
        } else {
            echo  "Something went wrong, please try again";
        }
    } catch (Exception $e) {
        echo "Message could not be sent. Mailer Error: {$mail->ErrorInfo}";
    }
    
}
?>
