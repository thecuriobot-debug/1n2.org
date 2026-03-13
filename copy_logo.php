#!/usr/bin/env php
<?php
// Read the logo from the uploaded file
$sourceFile = '/mnt/user-data/uploads/1n2_org_logo.png';
$destFile = '/Users/curiobot/Sites/1n2.org/1n2_org_logo.png';

if (file_exists($sourceFile)) {
    $data = file_get_contents($sourceFile);
    file_put_contents($destFile, $data);
    echo "Logo copied successfully!\n";
    echo "Size: " . filesize($destFile) . " bytes\n";
} else {
    echo "Source file not found!\n";
}
?>