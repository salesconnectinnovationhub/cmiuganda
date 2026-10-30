<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require './PHPMailer/src/Exception.php';
require './PHPMailer/src/PHPMailer.php';
require './PHPMailer/src/SMTP.php';
$noIcon = "https://cmiconstruction.netlify.app/assets/cancel.svg";
$yesIcon = "https://cmiconstruction.netlify.app/assets/check.svg";

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $fullname = $_POST['fullname'];
    $email = $_POST['email'];
    $phone = $_POST['phone'];
    $currentAddress = $_POST['currentAddress'];
    $countryCode = $_POST['countryCode'];
    $whatsappNo = $_POST['whatsappNo'];
    $mobilePhone = $_POST['mobilePhone'];
    $homePhone = $_POST['homePhone'];
    $homeCountry = $_POST['homeCountry'];
    $homeDistrict = $_POST['homeDistrict'];
    $anotherService = $_POST['anotherService'] ?? '';
    $projectCountry = $_POST['projectCountry'];
    $projectDistrict = $_POST['projectDistrict'];

    $checkboxFields = [
        'buildResidentialHouse', 'buildCommercialHouse', 'roofing', 'flooring', 'tiling', 'terrazzo',
        'furnitureFittings', 'buyingLand', 'landSurveying', 'landPlotting', 'landTitle', 'buildingPlans',
        'architectureDrawings', 'billsOfQuantities', 'supplyBuildingMaterials', 'securityAlarms',
        'homeCameras', 'airConditions', 'compoundDesigning', 'interiorDesigning', 'wallPainting',
        'secureSafeBoxBuilding', 'warehouseBuilding', 'washingBay', 'openBarDesigning', 'parkingLot',
    ];
    $checkboxValues = [];
    $iconValues = [];

    foreach ($checkboxFields as $field) {
        $isChecked = isset($_POST[$field]) && $_POST[$field] == 'on';
        
        $checkboxValues[$field] = $isChecked ? 'Yes' : 'No';
        $iconValues[$field] = $isChecked ? $yesIcon : $noIcon;
    }


    $anotherService = isset($_POST['anotherService']) ? $_POST['anotherService'] : '';
    $projectCountry = isset($_POST['projectCountry']) ? $_POST['projectCountry'] : '';
    $projectDistrict = isset($_POST['projectDistrict']) ? $_POST['projectDistrict'] : '';
    $mail = new PHPMailer(true);
    $dEmail = "cmigroupuganda@gmail.com";
    
    try {
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        $mail->Username = 'salesconnectinnovationhub@gmail.com';
        $mail->Password = 'idvofiyimcipxyzv';
        $mail->SMTPSecure = 'ssl';
        $mail->Port = 465;

        $mail->setFrom('uzisalesconnectinnovationhub@gmail.com', 'CMI Notifications');
        $mail->addAddress($dEmail);
        $mail->isHTML(true);
        $mail->Subject = 'New expression of interest';

        // Capture the content of the email verification template
        ob_start();
        include('emails/interest');
        $emailContent = ob_get_clean();

        $emailContent = str_replace('[fullname]', $fullname, $emailContent);
        $emailContent = str_replace('[email]', $email, $emailContent);
        $emailContent = str_replace('[phone]', $phone, $emailContent);
        $emailContent = str_replace('[currentAddress]', $currentAddress, $emailContent);
        $emailContent = str_replace('[countryCode]', $countryCode, $emailContent);
        $emailContent = str_replace('[whatsappNo]', $whatsappNo, $emailContent);
        $emailContent = str_replace('[mobilePhone]', $mobilePhone, $emailContent);
        $emailContent = str_replace('[homePhone]', $homePhone, $emailContent);
        $emailContent = str_replace('[homeCountry]', $homeCountry, $emailContent);
        $emailContent = str_replace('[homeDistrict]', $homeDistrict, $emailContent);
        $emailContent = str_replace('[anotherService]', $anotherService, $emailContent);
        $emailContent = str_replace('[projectCountry]', $projectCountry, $emailContent);
        $emailContent = str_replace('[projectDistrict]', $projectDistrict, $emailContent);
        
        foreach ($checkboxFields as $field) {
            $icon = isset($_POST[$field]) ? $yesIcon : $noIcon;
            
            $emailContent = str_replace("[$field" . "_icon]", $icon, $emailContent);
            $emailContent = str_replace("[$field]", isset($_POST[$field]) ? 'Yes' : 'No', $emailContent);
        }
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
