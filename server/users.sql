use usersinfo;
create table usersinfo(
  uid int not null auto_increment primary key,
  username varchar(255) not null,
  pwd varchar(255) not null,
  usex char(1) not null,
  uage tinyint(100) not null
);
insert into usersinfo (username, pwd, usex, uage) values ('sadgwewe', 'Sadgwewe1', '男', 23);