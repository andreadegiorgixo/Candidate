package com.candidate.mapper.AccountMapper;

import com.candidate.dto.AccountDTO;
import com.candidate.entity.Account;

public interface AccountMapper {
    AccountDTO toDTO(Account account);
    Account toEntity(AccountDTO accountDTO);
}