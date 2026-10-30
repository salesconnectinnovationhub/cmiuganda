<?php
error_reporting(0);
ini_set('display_errors', 0);
header("Access-Control-Allow-Origin: https://cmiconstruction.netlify.app");
header("Access-Control-Allow-Methods: *");
header("Access-Control-Allow-Headers: Content-Type");

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require './PHPMailer/src/Exception.php';
require './PHPMailer/src/PHPMailer.php';
require './PHPMailer/src/SMTP.php';

$servername = "localhost";
$username = "root";
$password = "admin@root";
$dbname = "cmichat";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Collect form data
    $commentorName = $_POST["commentor_name"];
    $commentorEmail = $_POST["commentor_email"];
    $commentorPhone = $_POST["commentor_phone"];
    $userRating = $_POST["userRating"];
    $userComment = $_POST["userComment"];

    // Validate the data (you can add more validation as needed)
    if (empty($commentorName) || empty($commentorEmail) || empty($commentorPhone) || empty($userRating) || empty($userComment)) {
        echo "All fields are required.";
    } else {
        $sql = "INSERT INTO comments (commentor_name, commentor_email, commentor_phone, user_rating, user_comment)
                VALUES ('$commentorName', '$commentorEmail', '$commentorPhone', '$userRating', '$userComment')";

        if ($conn->query($sql) === TRUE) {
            $mail = new PHPMailer(true);
            $dEmail = "angelbahabwa1@gmail.com";
            
            try {
                $mail->isSMTP();
                $mail->Host = 'smtp.gmail.com';
                $mail->SMTPAuth = true;
                $mail->Username = 'salesconnectinnovationhub@gmail.com';
                $mail->Password = 'idvofiyimcipxyzv';
                $mail->SMTPSecure = 'ssl';
                $mail->Port = 465;
        
                $mail->setFrom('uzisalesconnectinnovationhub@gmail.com', 'CMI Comments');
                $mail->addAddress($dEmail);
                $mail->isHTML(true);
                $mail->Subject = 'New service review';
        
                // Capture the content of the email verification template
                ob_start();
                include('emails/newcomment.php');
                $emailContent = ob_get_clean();
        
                $emailContent = str_replace('[name]', $commentorName, $emailContent);
                $emailContent = str_replace('[phone]', $commentorPhone, $emailContent);
                $emailContent = str_replace('[email]', $commentorEmail, $emailContent);
                $emailContent = str_replace('[stars]', $userRating, $emailContent);
                $emailContent = str_replace('[message]', $userComment, $emailContent);
               
                $mail->Body = $emailContent;
                if ($mail->send()) {
                    echo "Comment submitted successfully!";
                } else {
                    echo  "Something went wrong, please try again";
                }
            } catch (Exception $e) {
                echo "Message could not be sent. Mailer Error: {$mail->ErrorInfo}";
            }
            
        } else {
            echo "Error: " . $sql . "<br>" . $conn->error;
        }
    }
}else{
    echo "Invalid parameters";
}

// Close the database connection
$conn->close();
?>
