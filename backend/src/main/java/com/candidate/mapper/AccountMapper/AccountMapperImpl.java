package com.candidate.mapper.AccountMapper;

import com.candidate.dto.AccountDTO;
import com.candidate.entity.Account;

public class AccountMapperImpl implements AccountMapper {

    @Override
    public AccountDTO toDTO(Account account) {
        if (account == null) {
            return null;
        }
        AccountDTO accountDTO = new AccountDTO();
        accountDTO.setId(account.getId());
        accountDTO.setNome(account.getNome());
        accountDTO.setCognome(account.getCognome());
        accountDTO.setEmail(account.getEmail());
        accountDTO.setPassword(account.getPassword());
        return accountDTO;
    }

    @Override
    public Account toEntity(AccountDTO accountDTO) {
        if (accountDTO == null) {
            return null;
        }
        Account account = new Account();
        account.setId(accountDTO.getId());
        account.setNome(accountDTO.getNome());
        account.setCognome(accountDTO.getCognome());
        account.setEmail(accountDTO.getEmail());
        account.setPassword(accountDTO.getPassword());
        return account;
    }
}
