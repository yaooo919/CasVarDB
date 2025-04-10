sudo apt update
sudo apt install nodejs
sudo apt install npm
sudo npm install -g n
sudo npx n stable


sudo apt install mysql-server-y
sudo systemctl enable -now mysql
sudo mysql_secure_installation
systemctl status mysql
sudo mysql -u root -p
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '1018';
FLUSH PRIVILEGES;

